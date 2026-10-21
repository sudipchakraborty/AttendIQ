# AttendIQ

React attendance management frontend based on the supplied layout sketch.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates the production files in `dist`.

The initial page supports local file selection, date ranges, weekly leave, manual holiday days or holiday file selection, office hours, and a tiffin break. Prepare report validates the settings and opens a summary with a JSON settings export.

Files are held in browser memory only. File contents are not parsed yet; employee attendance calculations, salary calculations, backend storage, and report generation are future work. Refreshing the page resets the form.

## Deploy to Hostinger with GitHub Actions

This workflow is for Hostinger Web or Cloud hosting with FTP access, rather than a VPS or Website Builder site. GitHub builds the frontend and uploads only `dist/` using explicit FTPS on port 21. No Node.js process is needed on Hostinger.

1. In Hostinger hPanel, open your site's **Files → FTP Accounts** and obtain the FTP server, username, and password. Enable SSL for the website separately in hPanel.
2. In this GitHub repository, open **Settings → Secrets and variables → Actions**. Add these repository secrets:

   | Secret | Value |
   | --- | --- |
   | `FTP_SERVER` | FTP hostname or IP only, without `ftp://` or a path |
   | `FTP_USERNAME` | Your site's FTP username |
   | `FTP_PASSWORD` | Your site's FTP password |

3. Add `FTP_SERVER_DIR` on the **Variables** tab (or as a repository secret). A variable takes precedence if both exist. Set it to the target website directory as seen by that FTP account, with a trailing slash. Common examples are `/public_html/` for a domain root or `/public_html/attendiq/` for a subfolder. If the FTP account is already restricted to the website directory, use `./`. Confirm the path in an FTP client; do not point this at another site's directory.
4. Commit and push the project, including `package-lock.json` and `.github/workflows/deploy.yml`, to `main`. Every push to `main` deploys automatically. You can also open **Actions → Deploy AttendIQ to Hostinger → Run workflow** and select `main`.
5. After the workflow succeeds, visit your domain (or chosen subfolder) and check that the page loads. A local build alone does not verify a live deployment.

The workflow validates required configuration before deployment. Credentials are read from GitHub secrets. It does not perform a clean-slate deletion, though files tracked by earlier deployments can be updated or removed during synchronization. Use a dedicated website directory. Documents, source files, and `node_modules` are not uploaded.

Assets use relative URLs so the same build works at a domain root or subfolder. This initial single-page form does not require server-side routing rules.
