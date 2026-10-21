# Poll App

This is my Poll App, which I built during my frontend development course
at Developer Akademie.

You can create a survey, share its link and let other people vote.
The app works on desktop and mobile.

**[Try the app here](https://philipp-nowotnick.developerakademie.net/poll-app/)**

## What you can do

- Create surveys with several questions.
- Add up to six answers per question.
- Allow one answer or multiple answers.
- Choose a category and an optional end date.
- Filter surveys by category and switch between active and past surveys.
- See a preview of the results while selecting your answers.

The preview does not send anything to the database.
Your answers are only saved when you click “Complete survey”.

Unfinished surveys are saved in your browser, so you can close the dialog
and continue later. The app also remembers if you have already voted.
This is saved in the browser, so it does not prevent voting again
from another browser.

## Built with

- Angular 21
- TypeScript
- HTML and SCSS
- Supabase for storing surveys and updating results

## Run the project locally

You need Git, npm and a Node.js version that works with Angular 21.

Clone the repository and open the project folder:

```bash
git clone https://github.com/codeNow26/poll-app.git
cd poll-app
```

Install the dependencies:

```bash
npm ci
```

Start the app:

```bash
npm start
```

Then open `http://localhost:4200/` in your browser.
If that port is already in use, check the terminal for the correct address.

## Database

The Supabase connection is already configured in
`src/app/services/supabase.ts`. You do not need to create an `.env` file
to use the current setup.

You need an internet connection to load surveys and save votes.

**The local version uses the same database as the live app.**
If you create a survey or submit a vote locally, it will also appear there.

If you want to use your own Supabase project, you need to change the
connection details and set up the tables, permissions and Realtime updates.
The app uses three tables: `surveys`, `questions` and `survey_votes`.

## Build

To build the project:

```bash
npm run build
```

For my hosting setup, the app is inside a folder called `poll-app`,
so I use:

```bash
npm run build -- --base-href /poll-app/
```

I then upload the contents of `dist/poll-app/browser/` to that folder
on the server.

## About this project

This project helped me practise Angular components, reactive forms,
form validation and working with a database.

I also worked on the responsive layout and improved the app based
on feedback from my mentors. This included splitting larger components
into smaller parts to make the code easier to read.

## Author

Philipp Nowotnick

[My GitHub](https://github.com/codeNow26)