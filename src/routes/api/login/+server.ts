import { auth } from '$lib/server/auth';
import { json, type RequestHandler } from '@sveltejs/kit';
import { verify } from '@node-rs/argon2';
import { prisma } from '$lib/server/prisma';

export const POST: RequestHandler = async (event) => {
  let body;
  
  // 1. Safely extract JSON payload from Flutter
  try {
    body = await event.request.json();
  } catch {
    return json({ error: 'Invalid JSON request payload' }, { status: 400 });
  }

  const { identifier, password } = body;

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,255}$/;

  let user;
  
  // 2. Validate Credentials Structure
  try {
    if (
      typeof identifier !== 'string' ||
      identifier.length < 3 ||
      identifier.length > 31 ||
      !(usernameRegex.test(identifier) || emailRegex.test(identifier))
    ) {
      throw new Error('Invalid Username/Email!');
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 255) {
      throw new Error('Password must be between 8 and 255 characters!');
    } else if (!passwordRegex.test(password)) {
      throw new Error(
        'Password must contain 1 Number; 1 lowercase Letter; 1 uppercase Letter; 1 special character!'
      );
    }

    // 3. Query Database for matching identity
    user = await prisma.user.findFirstOrThrow({
      where: {
        OR: [{ email: identifier.toLocaleLowerCase() }, { username: identifier }]
      },
      include: {
        key: true
      }
    });

    // 4. Verify Argon2 password hash matches
    let passwordOk = false;
    for (const key of user.key) {
      if (key.type == 'email' && !passwordOk && key.passwordHash) {
        passwordOk = await verify(key.passwordHash, password, {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1
        });
      }
    }
    if (!passwordOk) {
      throw new Error('Password not correct!');
    }
  } catch (err) {
    if (err instanceof Error) {
      return json({ error: err.message }, { status: 422 });
    } else {
      return json({ error: 'Authentication internal failure' }, { status: 500 });
    }
  }

  // 5. Invalidate existing user sessions if present
  if (event.locals.session) {
    await auth.invalidateSession(event.locals.session.id);
  }

  // 6. Establish and register session state
  try {
    const { id, secret } = await auth.createSession(user.username);

    event.cookies.set('session_token', id + '.' + secret, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires: new Date(Date.now() + 90 * 1000 * 60 * 60 * 24)
    });

    await prisma.session.update({
      where: {
        id: id
      },
      data: {
        last_use: new Date(Date.now()),
        ip: event.getClientAddress(),
        session_created: new Date(Date.now())
      }
    });

    // 7. Success fallback. Return the session cookie explicitly for mobile clients manually parsing tracking tokens
    return json({ 
      success: true, 
      sessionToken: id + '.' + secret 
    });

  } catch (error) {
    return json({ error: 'Session assignment execution failure' }, { status: 500 });
  }
};