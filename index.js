import express from "express";
import pg from "pg";
import axios from "axios";

const app = express();
const port = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "book",
  password: "Khemo240",
  port: 5432,
});

await db.connect();
await db.query(`
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT DEFAULT '',
  recommend INT DEFAULT 0,
  date_read DATE,
  about TEXT DEFAULT '',
  cover_url TEXT DEFAULT ''
);
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT '';
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  book_id INT REFERENCES books(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

async function fetchOpenLibraryBookData({ isbn, title } = {}) {
  const trimmedIsbn = String(isbn || "").trim();
  const trimmedTitle = String(title || "").trim();

  // Prefer ISBN lookup when available
  if (trimmedIsbn) {
    try {
      const { data } = await axios.get("https://openlibrary.org/api/books", {
        params: {
          bibkeys: `ISBN:${trimmedIsbn}`,
          format: "json",
          jscmd: "data",
        },
        timeout: 5000,
      });

      const key = `ISBN:${trimmedIsbn}`;
      const bookData = data?.[key];
      const coverUrl = bookData?.cover?.medium || bookData?.cover?.large || `https://covers.openlibrary.org/b/isbn/${trimmedIsbn}-M.jpg`;
      const authors = Array.isArray(bookData?.authors)
        ? bookData.authors.map((author) => author.name).join(", ")
        : "";

      return {
        cover_url: coverUrl,
        title: bookData?.title || "",
        author: authors,
      };
    } catch (error) {
      console.warn("ISBN lookup failed:", error?.message || error);
      return {
        cover_url: `https://covers.openlibrary.org/b/isbn/${trimmedIsbn}-M.jpg`,
      };
    }
  }

  // If no ISBN, try searching by title
  if (trimmedTitle) {
    try {
      const { data } = await axios.get("https://openlibrary.org/search.json", {
        params: {
          title: trimmedTitle,
          limit: 1,
        },
        timeout: 5000,
      });

      const doc = data?.docs?.[0];
      if (!doc) return {};

      const foundTitle = doc.title || trimmedTitle;
      const foundAuthor = Array.isArray(doc.author_name) ? doc.author_name.join(", ") : (doc.author_name || "");

      // Prefer cover by cover_i, otherwise try isbn from the search result
      let coverUrl = "";
      if (doc.cover_i) {
        coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
      } else if (Array.isArray(doc.isbn) && doc.isbn.length > 0) {
        coverUrl = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
      } else {
        coverUrl = `https://via.placeholder.com/160x240?text=No+Cover`;
      }

      return {
        cover_url: coverUrl,
        title: foundTitle,
        author: foundAuthor,
      };
    } catch (err) {
      console.warn("Title search failed:", err?.message || err);
      return {};
    }
  }

  return {};
}

app.get("/", async (req, res) => {
  try {
    const { sort } = req.query;
    let orderBy = "id DESC";

    if (sort === "rating") {
      orderBy = "recommend DESC, id DESC";
    } else if (sort === "title") {
      orderBy = "LOWER(title) ASC, id DESC";
    } else if (sort === "recent") {
      orderBy = "id DESC";
    }

    const booksResult = await db.query(`SELECT * FROM books ORDER BY ${orderBy}`);
    const notesResult = await db.query("SELECT * FROM notes ORDER BY created_at DESC");
    const notesByBook = {};
    notesResult.rows.forEach((note) => {
      if (!notesByBook[note.book_id]) {
        notesByBook[note.book_id] = [];
      }
      notesByBook[note.book_id].push(note);
    });

    res.render("index.ejs", {
      books: booksResult.rows,
      notesByBook,
      sort: sort || "recent",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error occurred while fetching books and notes");
  }
});

app.get("/edit-book/:id", async (req, res) => {
  try {
    const bookResult = await db.query("SELECT * FROM books WHERE id = $1", [req.params.id]);
    if (bookResult.rows.length === 0) {
      return res.status(404).send("Book not found");
    }

    res.render("edit.ejs", { book: bookResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error occurred while loading book edit form");
  }
});

app.post("/edit-book/:id", async (req, res) => {
  try {
    const { title, author, isbn, recommend, date_read, about } = req.body;
    const trimmedIsbn = String(isbn || "").trim();
    if (!trimmedIsbn) {
      return res.status(400).send("ISBN is required.");
    }

    const openLibraryData = await fetchOpenLibraryBookData({ isbn: trimmedIsbn, title });
    const coverUrl = openLibraryData.cover_url || "";
    const bookTitle = title || openLibraryData.title || "Unknown Title";
    const bookAuthor = author || openLibraryData.author || "Unknown Author";

    await db.query(
      "UPDATE books SET title = $1, author = $2, isbn = $3, recommend = $4, date_read = $5, about = $6, cover_url = $7 WHERE id = $8",
      [bookTitle, bookAuthor, trimmedIsbn, parseInt(recommend, 10) || 0, date_read || null, about || "", coverUrl, req.params.id]
    );

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error occurred while updating book");
  }
});

app.post("/add-book", async (req, res) => {
  try {
    const { title, author, isbn, recommend, date_read, about } = req.body;
    const trimmedIsbn = String(isbn || "").trim();
    if (!trimmedIsbn) {
      return res.status(400).send("ISBN is required.");
    }

    const openLibraryData = await fetchOpenLibraryBookData({ isbn: trimmedIsbn, title });
    const coverUrl = openLibraryData.cover_url || "";
    const bookTitle = title || openLibraryData.title || "Unknown Title";
    const bookAuthor = author || openLibraryData.author || "Unknown Author";

    await db.query(
      "INSERT INTO books(title, author, isbn, recommend, date_read, about, cover_url) VALUES($1, $2, $3, $4, $5, $6, $7)",
      [bookTitle, bookAuthor, trimmedIsbn, parseInt(recommend, 10) || 0, date_read || null, about || "", coverUrl]
    );
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error occurred while adding book");
  }
});

app.post("/delete-book/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM books WHERE id = $1", [req.params.id]);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error occurred while deleting book");
  }
});

app.post("/add-note/:bookId", async (req, res) => {
  try {
    const content = req.body.content?.trim();
    if (!content) {
      return res.redirect("/");
    }
    await db.query(
      "INSERT INTO notes(book_id, content) VALUES($1, $2)",
      [req.params.bookId, content]
    );
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error occurred while adding note");
  }
});

app.post("/delete-note/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM notes WHERE id = $1", [req.params.id]);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error occurred while deleting note");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});