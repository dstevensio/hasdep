"use strict";

const Fs = require("fs");
const Os = require("os");
const Path = require("path");
const Bossy = require("bossy");
const Semver = require("semver");
const Chalk = require("chalk");

let Config;
let neg = false;

const GitHubApi = require("github");
let github;
let token = "";
let ghAuth = {};

const definition = {
  o: {
    description: "Organization (or User) to search in",
    alias: "org"
  },
  r: {
    description: "Repository to search in",
    alias: "repo"
  },
  d: {
    description: "Dependency to look for (checks package.json name field)",
    alias: "dep"
  },
  v: {
    description: "Specific version of the dependency to check for (based on npm semver comparison)",
    alias: "version"
  },
  n: {
    alias: "negative",
    description: "<full|dev|any> List out repositories that do not have the specified dependency as a full dep, a dev dep, or either"
  }
};

const contentToString = (base64encodedString) =>
  new Buffer(base64encodedString, "base64").toString("ascii");

const searchRepo = (args) => {

  const dep = args.d;
  const org = args.o;
  const repo = args.r;
  const version = args.v;

  console.log(Chalk.green(`Searching ${org}/${repo} for ${dep}`) + (version ? Chalk.green(`@${version}`) : ""));

  searchWithinRepo(org, repo, dep, version);

};

const checkDeps = (depsObj, dep, version, cb) => {

  let matches = 0;

  Object.keys(depsObj).map((dependencyName) => {

    if (dependencyName !== dep) {
      return;
    }

    ++matches;

    let color = "yellow";
    let info = "";

    const specifiedVersion = depsObj[dependencyName];

    if (version) {
      if (Semver.satisfies(version, specifiedVersion)) {
        color = "green";
        info = " ✔ version OK";
      } else {
        color = "red";
        info = " ✕ version MISMATCH";
      }
    }

    return cb(Chalk.white(`${dependencyName}@`) + Chalk[color](`${specifiedVersion}${info}`)); 

  });

  if (!matches) {
    cb(null);
  }
};

const logResult = (org, repo, result, isDev) => {
  if (neg) {
    return;
  }

  console.log(Chalk.cyan(`${org}/${repo} has `) + result + (isDev ? Chalk.gray(" [DEV DEPENDENCY]") : ""));
};

const logNegative = (org, repo, dep, isDev) => {
  if (!neg || neg === "full" && isDev || neg === "dev" && !isDev) {
    return;
  }

  console.log(Chalk.yellow(`${org}/${repo} does not have ${dep} as a ` + (isDev ? "devDependency" : "dependency")));
};

const searchWithinRepo = (org, repo, dep, version) => {

  const opts = {
    user: org,
    repo: repo,
    path: "package.json"
  };

  github.authenticate(ghAuth);

  github.repos.getContent(opts, (err, response) => {

    if (err) {
      if (err.code !== 404) {
        console.log("err", err);
      }
      return;
    }

    if (!response || !response.content) {
      console.log(Chalk.bgRed(`No package.json in ${org}/${repo} - SKIPPED`));
      return;
    }

    try {
      const pkg = JSON.parse(contentToString(response.content));

      if (pkg.dependencies) {
        checkDeps(pkg.dependencies, dep, version, (result) => {
          if (!result) {
            logNegative(org, repo, dep);
          } else {
            logResult(org, repo, result);
          }
        });
      }

      if (pkg.devDependencies) {
        checkDeps(pkg.devDependencies, dep, version, (result) => {
          if (!result) {
            logNegative(org, repo, dep, true);
          } else {
            logResult(org, repo, result, true);
          }
        });
      }

    } catch (err) {
      console.log(Chalk.red(`Error parsing package.json for ${org}/${repo}`), err);
    }

  });

};

const searchOrg = (args) => {

  const dep = args.d;
  const org = args.o;
  const version = args.v;

  console.log(Chalk.green(`Searching all repos in ${org} for ${dep}`) + (version ? Chalk.green(`@${version}`) : ""));

  github.authenticate(ghAuth);

  github.repos.getForUser({
    user: org,
    per_page: 100
  }, (err, response) => {
    if (err) {
      throw err;
    }

    response.forEach((repo) => {
      searchWithinRepo(org, repo.name, dep, version);
    });

  });

};

const args = Bossy.parse(definition);

if (args instanceof Error) {
  console.error(error);
  return;
}

if (!args.o || !args.d) {
  console.log(Chalk.red(Bossy.usage(definition, "hasdep -o <org> -d <dependency>")));
  return;
}

if (args.v && !Semver.valid(args.v)) {
  console.log(Chalk.red(`${args.v} is not a valid version format`));
  return;
}

const processArgs = () => {
  neg = args.n;

  if (args.r) {
    return searchRepo(args);
  }

  searchOrg(args);
};

const main = () => {
  github = new GitHubApi(Config.githubApi);

  token = process.env[Config.token_env_name || "GHACCESS_TOKEN"];

  if (!token) {
    console.log(Chalk.red("A Github Access Token is required for hasdep to work"));
    console.log(Chalk.yellow("Please set the environment variable GHACCESS_TOKEN to your access token"));
    console.log(Chalk.yellow("For additional tokens, set an env variable with token value and add variable name to config token_env_name"));
    return;
  }

  ghAuth = {
    type: "oauth",
    token
  };

  processArgs();

};

try {
  // Check for local config
  let configFilePath = Path.join(process.cwd(), "hasdep-config.json");
  Fs.stat(configFilePath, (err, stats) => {
    if (err) {
      // Fallback to Global config, if present
      configFilePath = Path.join(Os.homedir(), "hasdep-config.json");
      Fs.stat(configFilePath, (err, stats) => {
        if (err) {
          console.log(Chalk.red("Couldn't load config file at ./hasdep-config.json (project specific) or global ~/hasdep-config.json - create one based on https://github.com/shakefon/hasdep/blob/master/config.default.json"));
          throw err;
        }

        console.log(Chalk.bgMagenta("Using global hasdep config file in homedir"));
        Config = JSON.parse(Fs.readFileSync(configFilePath));

        main();

      });
      return;
    }

    console.log(Chalk.bgMagenta("Using local project hasdep config file"));
    Config = JSON.parse(Fs.readFileSync(configFilePath));

    main();

  });

} catch (err) {
  throw err;
}

