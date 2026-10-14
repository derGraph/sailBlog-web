import type { User, Session, Role } from '#prisma';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare global {
  namespace App {
    interface Locals {
      user: User | null;
      session: Session | null;
      role: Role | null;
    }
    // interface PageData {}
    // interface Error {}
    // interface Platform {}
  }
}

export {};
