# LearnHub (static site)

Plain HTML, CSS and JavaScript, hosted free on Azure Static Web Apps.

- `STATIC_MODE` in `static/script.js` is `true`: login and register are switched off and the contact form opens an email.
- The dashboards (`student.html`, `tutor.html`, `admin.html`) are kept but redirected to /login in `staticwebapp.config.json`.

## When the Python backend goes live
1. Set `STATIC_MODE` to `false` in `static/script.js`.
2. Delete the six `/student`, `/tutor`, `/admin` redirect lines in `staticwebapp.config.json`.
3. Deploy the full project (with the backend) instead, so `/api/...` exists.
