# SMTP email alerts

Hark already sends email through Nodemailer and renders a shared Reddit/X digest. Use your own mailbox's SMTP service for a local pilot. No new email provider integration or application-code change is required.

## Configure the sender

Log in to your mailbox, locate its POP3/IMAP/SMTP settings, enable a service that includes SMTP, and generate a client authorization code. Settings labels and account-verification steps vary by provider and interface version. Use that authorization code rather than the web-login password. This process does not require reading the mailbox through IMAP.

Tencent's [SMTP configuration table](https://intl.cloud.tencent.com/zh/document/product/1266/71700) lists `smtp.qq.com:465` for QQ and `smtp.163.com:465` for 163, both using SSL/TLS. Keep the From address equal to the authenticated mailbox. Hark accepts a plain email address in ALERTS_FROM_EMAIL, without a display-name wrapper.

Put these settings in ignored root .env.local. Percent-encode the username and authorization code in the URL; never paste real credentials into documentation or a chat.

```dotenv
ALERTS_FROM_EMAIL=you@qq.com
SMTP_URL="smtps://you%40qq.com:YOUR_URL_ENCODED_AUTH_CODE@smtp.qq.com:465?connectionTimeout=10000&greetingTimeout=10000&socketTimeout=15000&dnsTimeout=10000"
ALERT_INVITES=false
```

For 163, use your @163.com account and smtp.163.com. Leave AZURE_EMAIL_CONNECTION_STRING blank when selecting SMTP: the existing application prefers Azure if both carriers are configured. Keep the environment file private and out of Git.

## Local proxy, when required

Node's HTTP_PROXY/HTTPS_PROXY settings do not automatically configure Nodemailer's native SMTP connection. On this Mac, direct resolution of smtp.qq.com failed with ENOTFOUND; the same credentials authenticated immediately through the existing local HTTP proxy.

For that specific network setup, append `&proxy=http%3A%2F%2F127.0.0.1%3A7890` to the SMTP_URL above. Nodemailer uses HTTP CONNECT, with SMTP TLS verification retained. Use your actual running proxy endpoint; this optional local endpoint is not a deployment configuration. A stopped proxy breaks that connection. Do not disable TLS verification or replace a working authorization code to solve a DNS problem.

The numeric URL options bound connection, greeting, socket inactivity and DNS waits in the installed Nodemailer version. They are not a single total-operation deadline. Restart the app after changing its environment.

## Connect and verify

Start the app with `npm run preview:local` or `npm run dev:local`; these keep the scheduler disabled. In the intended project's Alerts page, add Email digest with an address you control and choose Daily. Press Send test once, then check the mailbox, including its spam folder. The original three-lead sample does not advance lastSentAt and its action links are harmless sample links.

A real digest uses the original eligibility rules, including status, score/word filters, freshness and discovery window. X asks can join the email when X and the project's X alerts are enabled; reply-kind X leads do not join digests. Old candidates may correctly produce no email. Do not change their timestamps to manufacture a successful send.

The original digest pass updates lastSentAt after the mail server accepts a real message. An immediate rerun of a Daily channel should send nothing. Server acceptance and confirmed inbox receipt are different checks; this pilot verified both, with receipt confirmed by the mailbox owner.

Adding a channel does not activate the disabled local scheduler. Recurring delivery and deployment remain separate acceptance stages. With APP_URL pointing to localhost, application links and local image URLs require access to that machine; this pilot does not verify public links, remote images or phone access.

Measured pilot: [SMTP acceptance](acceptance/05-smtp-alerts.md).
