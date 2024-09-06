module.exports = {
    apps : [
        {
            name: "sailBlog web Handler",
            script: "/app/build/index.js",
            env_production: {
                NODE_ENV: "production"
            }
        },
        {
            name: "simplifier",
            script: "/app/workers/simplifyGps.js"
        }
    ]
}
  