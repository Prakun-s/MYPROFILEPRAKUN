const express = require("express");
const router = express.Router();
const db = require("./db");

// GET ข้อมูล Inventory ทั้งหมด
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM Inventory"
        );

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});

module.exports = router;