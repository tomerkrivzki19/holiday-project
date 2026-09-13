const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const eventsFile = path.join(__dirname, "data", "events.json");

let events = [];

try {
  events = JSON.parse(fs.readFileSync(eventsFile, "utf8"));
  console.log(`Loaded ${events.length} events into memory`);
} catch (error) {
  console.error("Failed to load events data:", error.message);
  process.exit(1);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    console.log("Invalid JSON body received");
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  return next(error);
});

function findEventById(eventId) {
  const id = Number(eventId);
  if (!Number.isInteger(id)) {
    return null;
  }

  return events.find((event) => event.id === id) || null;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value) {
  return isNonEmptyString(value) && value.includes("@") && value.includes(".");
}

app.get("/health", (req, res) => {
  console.log("GET /health");
  res.status(200).json({
    status: "healthy",
    service: "holiday-events",
    version: process.env.APP_VERSION || "development",
  });
});

app.get("/api/events", (req, res) => {
  console.log("GET /api/events");
  res.status(200).json(events);
});

app.get("/api/events/:id", (req, res) => {
  const event = findEventById(req.params.id);
  console.log(`GET /api/events/${req.params.id}`);

  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  res.status(200).json(event);
});

app.post("/api/register", (req, res) => {
  try {
    const { name, email, eventId } = req.body || {};

    if (!isNonEmptyString(name)) {
      console.log("Invalid registration: name is required");
      return res.status(400).json({ error: "Name is required" });
    }

    if (!isValidEmail(email)) {
      console.log("Invalid registration: email is required");
      return res.status(400).json({ error: "A valid email is required" });
    }

    if (eventId === undefined || eventId === null || eventId === "") {
      console.log("Invalid registration: eventId is required");
      return res.status(400).json({ error: "eventId is required" });
    }

    const event = findEventById(eventId);

    if (!event) {
      console.log(`Invalid registration: event ${eventId} not found`);
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.spots <= 0) {
      console.log(`Registration rejected: event ${event.id} is full`);
      return res.status(409).json({ error: "Event is full" });
    }

    event.spots -= 1;
    console.log(`Registration created for event ${event.id}`);

    res.status(201).json({
      message: "You're registered! See you at the event.",
      registration: {
        name: name.trim(),
        email: email.trim(),
        eventId: event.id,
        eventName: event.name,
      },
      event,
    });
  } catch (error) {
    console.error("Unexpected server error:", error.message);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

app.use((error, req, res, next) => {
  console.error("Unexpected server error:", error.message);
  res.status(500).json({ error: "Unexpected server error" });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
