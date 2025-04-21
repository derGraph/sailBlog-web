module.exports = {
    apps : [
        {
            name: "sailBlog web Handler",
            script: "/app/build/index.js",
            env_production: {
                NODE_ENV: "production"
            },
            exec_mode: "cluster",
            instances: 4
        }/*,
        {
            name: "simplifier",
            script: "/app/workers/workers/index.js",
            env_production: {
                NODE_ENV: "production"
            }
        }*/
    ]
};
  