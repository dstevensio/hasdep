#hasdep

Check for a specified dependency across all repositories in a Github Organization
or a specific repository.

Requires a GH Access Token set as an environment variable.

First, if you don't already have a token, create one by going to Github.com or your private
Github instance, clicking on your avatar in the top right and choosing "Settings", then choosing
"Personal Access Tokens" from the menu on the left, and hit "Generate New Token". Name it "hasdep"
and copy it.

Then add to your `~/.bash_profile` or `~/.bashrc` or wherever you do this kind of thing on your machine:

`export GHACCESS_TOKEN=XXXXXXXXXXXXXXXXXXXXX` where _XXXXXXXXXXXXXXXXXX_ is the token you just copied.

Save it and source your bash file before trying to continue.

##Installation

`npm install hasdep -g`

##Setup

Copy the supplied `config.default.json` to `config.json`

`cp config.default.json config.json`

If you're searching Github.com, you're good to proceed.

If you're searching an internal github instance, change `host` to the correct domain. E.g. if your
Github instance is at `https://github02.acme-anvils.com` you would set:

`host: "github02.acme-anvils.com",`

in `config.json`.

You probably don't want to accidentally commit that value to a public repo, which is why `config.json`
is in `.gitignore`. Information Leakage is a genuine security threat, folks.

##Usage

###Options

```
-o Organization (or User) to search in
-r Repository to search in
-d Dependency to look for (name that appears in the module's package.json name field)
-v Specific Version to check for (will check based on npm SemVer comparison)
```

###Examples

Check for `react` in all repositories in Organization `acme`

```
hasdep -o acme -d react
```

Check if repository `anvil` in Organization `acme` has dependency `roadrunner`

```
hasdep -o acme -r anvil -d roadrunner
```

Check for `hapi@11.0.0` in all repositories in Organization `acme`

```
hasdep -o acme -d hapi -v 11.0.0
```

##Help

If it's not doing what you think it should be doing, or what you wish it did,
file an issue on this repository with as much detail concerning what you did,
and what happened, as you can possibly spare.

