# Hangout

Voice and text chat for two. Peer-to-peer (WebRTC via PeerJS), no server to run.

## One-time setup
1. Create a **public** GitHub repo named `hangout` (public so friends' apps can check for updates without a login).
2. In `package.json`, change `YOUR-GITHUB-USERNAME` (under build > publish) to your GitHub username.
3. Push this folder to the repo:
       git init && git add . && git commit -m "first version"
       git branch -M main
       git remote add origin https://github.com/YOUR-GITHUB-USERNAME/hangout.git
       git push -u origin main
4. Release it:
       git tag v1.0.0 && git push --tags
   GitHub builds the Windows installer and Mac zips (a few minutes; watch the Actions tab).
5. Send friends the link to your repo's **Releases** page. They download once.

## Shipping an update
1. Change the code.
2. Run:  npm version patch   (bumps 1.0.0 to 1.0.1 and makes the tag)
3. Run:  git push --follow-tags
   (use `npm version minor` or `major` for bigger bumps)

When the build finishes, running copies notice within about 30 minutes, or on next launch.
- **Windows:** downloads in the background, then shows "Restart to update".
- **Mac:** shows "Version X is available" with a Download button. Unsigned Mac apps can't install themselves.

## Run from source
    npm install
    npm start
