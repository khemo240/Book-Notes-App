# Book-Notes-App

A dynamic Node.js web application designed to help users keep track of books they have read, complete with personal notes, ratings, and custom sort options. The application integrates with a PostgreSQL database to persist book data and leverages a public books API to automatically fetch cover art.

## Features

* **Book Tracking:** Log books you have read, including the title, author, date read, and your personal rating.
* **Rich Notes:** Write and store detailed notes or summaries for every book in your collection.
* **Automated Cover Art:** Automatically fetches and displays book covers using an external Books API based on the book's identifier (ISBN/Key).
* **Sorting & Filtering:** Organize your collection seamlessly by rating, recency, or title.
* **Full CRUD Functionality:** Easily add new books, edit existing notes or ratings, and delete entries from your log.

## Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL
* **Frontend:** Embedded JavaScript templating (EJS), Bootstrap, jQuery / JavaScript
* **API Integration:** Open Library Covers API (or your specific choice)

---

## Prerequisites

Before running this project locally, ensure you have the following installed:

* [Node.js](https://nodejs.org/) (v14+ recommended)
* Access to your configured PostgreSQL database

---

## Getting Started

### 1. Clone the Repository
```bash
git clone [https://github.com/khemo240/Book-Notes-App.git](https://github.com/khemo240/Book-Notes-App.git)
cd Book-Notes-App
2. Install Dependencies
Bash
npm install
3. Environment Configuration
Create a .env file in the root directory and add your existing database connection details:

Code snippet
PORT=3000
DB_USER=your_postgres_username
DB_HOST=localhost
DB_NAME=your_database_name
DB_PASSWORD=your_database_password
DB_PORT=5432
4. Run the Application
Development mode (with nodemon if configured):

Bash
npm run dev
Standard mode:

Bash
npm start
Open your browser and navigate to http://localhost:3000 to see the application in action.

Folder Structure
Plaintext
├── public/          # Static assets (CSS, JS, Images)
├── views/           # EJS templates for front-end rendering
├── queries.sql      # Database schema and historical queries
├── app.js           # Express application setup and routing
├── .env.example     # Template for environment variables
├── package.json     # Project dependencies and scripts
└── README.md        # Project documentation
Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

License
This project is licensed under the MIT License.
