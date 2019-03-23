# create-gameplan

A CLI to initialize projects from a git repo template.

This was mainly built for personal use. I wanted to use a template maker, but I
didn't want to have to keep a global node module up to date, or a global
template up to date. I wanted a CLI that I could use that would pull a template
from a github repo and run it, provide some customization options for the
template, and not have to worry about keeping things up to date. I get the use
case for having locked versions for things, but I needed something lighter.
Backwards compatibility might be an issue in the future, so for now, I'll stick
with the 0.x versions and backwards incompatible changes may happen.

# Usage

For this to work, you need a gameplan module, which is a node module located at
some sort of git repository. `gameplan` will clone that repo, and run the
module's run function.

Note that the module does not need to be published to npm and does not need to
be a template for a node/javascript project. You'll need to have a single
JavaScript file with an optional `.options()` method and a required `.run()`
function exposed, but the files it copies over are just files. You could build
a "gameplan" template for an elixir project, a php project, or a note taking
project.

## Preferred Usage

```sh
npm init gameplan <repo> [options] -- [gameplan-options]
```

```sh
# Note the "---" instead of "--". `yarn create` strips out the "--" argument
# which is used to separate create-gameplan arguments from the template options.
yarn create gameplan <repo> [options] --- [gameplan-options]
```

## Installed Usage

```sh
npm install --global create-gameplan
# or
yarn global add create-gameplan

create-gameplan <repo> [options] -- [gameplan-options]
```

## Options

- `--prompt` When runing a gameplan, it will prompt you for the options using
  [inquirer.js](https://www.npmjs.com/package/inquirer)

- `--` or `---` Anything after this will be passed as options to the gameplan
  options. If you want to know what options are available for a gameplan, put
  `--help` somewhere after your `--` or `---`

# Create a gameplan template

For a gameplan template, the minimum you need is a single JavaScript file. It
needs to be an `index.js`, unless you add a `package.json` with a "main"
property that points to your JavaScript file.

<details>
<summary>index.js</summary>

```js
exports.run = ({ operations }) => {}
```

</details>

This does nothing, but the operations object has some methods on it to do
things. Note that all of these don't run the commands when your template code is
running; it just queues it up for later:

- `operations.copy(fromPath, toPath)`

  Copy a file from your gameplan template to the destination projects

  - `fromPath` - Should be an array of path segments that are a relative path
    from the root of your gameplan project. Example: `['templates', 'src', 'index.js']`
    refers to a path relative to your project: `templates/src/index.js`. The
    reason for the array is that it makes it more cross-platform compatible
    because Windows has different file separators. You can just pass a string
    though if you're not worried about cross-platform compatibility

  - `toPath` - Same as above, but it's the target path in the user's directory.

- `operations.template(fromPath, toPath, variables)`

  Like copy, but it will do template replacing in the fromPath.

  - `fromPath` - Same as above fromPath
  - `toPath` - Same as above toPath
  - `variables` - An object with keys and string values that will be used to
    replace the contents of the file at `fromPath` with variable replacement.

    If you have a file with these contents: `Hello {{name}}` and you pass in
    `{ name: 'Jack' }` as the variables, it will make the contents of the file
    `Hello Jack`.

- `operations.json(object, toPath)`

  `JSON.stringify`s the object to the destination toPath. Good for things like
  `package.json` or other JSON manifest files.

  - `object` - The object to stringify
  - `toPath` - Same as above toPath

- `operations.spawn(command, ...args)`

  Runs a shell command. Use sparingly or for things your users will be sure to
  have, like `git` or `npm`

You can also specify an options function to specify what options you want the
user to have when consuming a gameplan. So let's change that `index.js`:

<details>
<summary>index.js</summary>

```js
const path = require('path')

exports.options = ({ directory }) => ({
  // This is the key that will show up in the options below
  name: {
    type: 'string', // type can be 'string' or 'boolean'
    description: 'The name of the thing', // description is optional, but is used in the --help
    prompt: 'What is the name of the thing?', // prompt is also optional, but is used when prompting with --prompt
    default: path.basename(directory) // default is required. Don't require config from your users, for now...
  },
  packageManager: {
    type: 'string',
    choices: ['npm', 'yarn'], // You can also do "enum" choices with strings
    default: 'yarn' // but you still need a default
  }
})

exports.run = ({ options, operations }) => {
  // options.name and options.packageManager will be available here as selected
  // by the user, or just the selected defaults
}
```

</details>

If you would like to start your own gameplan, you can use gameplan to start it!

```
yarn create gameplan https://github.com/ksmithut/gameplan-gameplan <foldername> --prompt
```

```
npm init gameplan https://github.com/ksmithut/gameplan-gameplan <foldername> --prompt
```

As far as conventions for naming gameplan projects, I'd say prefix with `gameplan-`
even though in a sentence it sounds better with `gameplan` at the end. Prefixing
is easier to search and sort by, but because they'll only be published on places
like github or gitlab, naming shouldn't be a primary concern. It's easy to
rename things. Right? RIGHT??!?1
