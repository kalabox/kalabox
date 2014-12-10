 #!/bin/bash

npm config set //registry.npmjs.org/:_password $NPM_PASS
npm config set //registry.npmjs.org/:username $NPM_USER
npm config set //registry.npmjs.org/:email $NPM_EMAIL
npm config set //registry.npmjs.org/:always-auth false
