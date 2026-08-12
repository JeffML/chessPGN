# Release flow

## 1. Prepare the release

- bump the version in [package.json](package.json)
- run `npm run api:update`
- review the generated API report in
  [etc/chess-pgn.api.md](etc/chess-pgn.api.md)
- commit the version bump and API report

## 2. Tag the release

### **Example:**

```bash
git tag -a v1.4.2 -m "v1.4.2"
git push origin main
git push origin v1.4.2
```

## 3. Publish to npm

The GitHub Actions publish workflow in `.github/workflows/publish.yml` handles
the npm release using Trusted Publisher / OIDC.

## Notes

- Do not run npm publish locally for the official release.
- Keep NODE_AUTH_TOKEN out of the workflow when using OIDC.
- api:update should happen before tagging, not after.
