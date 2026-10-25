# AttendIQ

React attendance management frontend based on the supplied layout sketch.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates the production files in `dist`.

The setup page supports attendance and salary text uploads, date ranges, weekly leave, editable holiday dates and purposes, office hours, and a tiffin break. Each missing upload independently falls back to `src/assets/Attendance.TXT` or `src/assets/Salary.txt`. Press Report to parse the files and open `#/report`. Each employee has a separate named tab with daily attendance, salary allocations, review flags, a salary total, and an employee-specific CSV download. Weekly, Monthly, Yearly, and Custom periods are supported. Back to setup retains the form and selected files; refreshing uses the bundled files. Hash routes support static hosting in subfolders.

Attendance input is the supplied tab-separated device format: `No`, `TMNo`, `EnNo`, `Name GMNo`, `Mode`, `DateTime` (`YYYY/MM/DD HH:mm:ss`). Salary text contains one employee name and monthly amount per line, separated by whitespace. Other upload formats are rejected explicitly. Salaries match names ignoring case and extra spaces; unnamed device IDs remain unmatched. Salary-only employees still receive a tab. The bundled attendance file has 279 punches spanning December 2019 to September 2025; when the selected period has no punches for an employee, the report opens their first recorded month. A Recorded month selector lists the months present in that employee's log. Explicit date controls remain available; employees without punches show a warning.

Salary policy: pay the full listed monthly amount without attendance deductions. Daily salary cells allocate that amount across every calendar day, including holidays and weekly leave. Weekly/custom periods sum those calendar-day allocations. Integer-cent allocation ensures a complete month totals exactly the listed salary; a full year totals twelve monthly amounts. This assumes the supplied monthly rate applies throughout the selected period because the source has no employment dates or salary history. Missing salary is shown as unavailable, never guessed as zero.

Work hours are informational: sort/deduplicate same-day punches and pair alternating in/out times. Two-punch days deduct the configured tiffin break; four or more punches use recorded breaks. Three-punch days show the second and third recorded punches as tiffin entry and return, with their elapsed duration; exit and working hours remain unconfirmed. Odd punch counts have unavailable hours and an incomplete flag. Tiffin times that are absent from the file are labelled Not recorded. Overnight shifts need manual review. Device Mode values are retained by the parser but do not identify in/out direction. Manual holidays and weekly leave label nonworking days; holiday-file contents are not parsed. These do not affect the full monthly payment. CSV includes the policy, source names, daily status, all punches, hours, and salary totals.

Files are processed locally in browser memory. Bundled files are included in the frontend build; uploaded replacements reset on refresh. Run `npm test` for parser and salary calculation checks, and `npm run build` for production validation.

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
