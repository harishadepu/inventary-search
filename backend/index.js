const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({origin:"https://fantastic-taffy-b33dfb.netlify.app"}));

/* =========================
   🔗 MongoDB Connection
========================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ DB Error:", err.message);
    process.exit(1);
  });

/* =========================
   📦 Schemas
========================= */

// Supplier Schema
const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

const Supplier = mongoose.model("Supplier", supplierSchema);

// Inventory Schema
const inventorySchema = new mongoose.Schema(
  {
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true
    },
    product_name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    price: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { timestamps: true }
);

// 🔥 Add index for faster search
inventorySchema.index({ product_name: "text", category: 1, price: 1 });

const Inventory = mongoose.model("Inventory", inventorySchema);

/* =========================
   🌱 Seed Data
========================= */
app.get("/seed", async (req, res) => {
  try {
    const supplier = await Supplier.create({
      name: "Default Supplier",
      city: "Hyderabad"
    });

    const sample = [
      { product_name: "iPhone 13", category: "Electronics", quantity: 10, price: 70000 },
      { product_name: "Samsung TV", category: "Electronics", quantity: 5, price: 50000 },
      { product_name: "Office Chair", category: "Furniture", quantity: 20, price: 5000 },
      { product_name: "Dining Table", category: "Furniture", quantity: 3, price: 15000 },
      { product_name: "Nike Shoes", category: "Footwear", quantity: 15, price: 4000 },
      { product_name: "Adidas Shoes", category: "Footwear", quantity: 12, price: 4500 }
    ];

    const items = sample.map(item => ({
      ...item,
      supplier_id: supplier._id
    }));

    await Inventory.insertMany(items);

    res.json({ message: "✅ Seed data inserted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   🔍 Search API
========================= */
app.get('/', (req, res) => {
  res.send('Welcome to the Inventory Search API');
});
app.get("/search", async (req, res) => {
  try {
    let { q, category, minPrice, maxPrice } = req.query;

    let filter = {};

    // Clean inputs
    q = q?.trim();
    category = category?.trim();

    // Product search (case-insensitive)
    if (q) {
      filter.product_name = { $regex: q, $options: "i" };
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Price filter
    if (minPrice || maxPrice) {
      filter.price = {};

      if (minPrice && !isNaN(minPrice)) {
        filter.price.$gte = Number(minPrice);
      }

      if (maxPrice && !isNaN(maxPrice)) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    // Validate price range
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      return res.status(400).json({ error: "Invalid price range" });
    }

    const results = await Inventory.find(filter);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   🧾 Supplier API
========================= */
app.post("/supplier", async (req, res) => {
  try {
    const { name, city } = req.body;

    if (!name || !city) {
      return res.status(400).json({ error: "Name and city required" });
    }

    const supplier = await Supplier.create({ name, city });

    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   📦 Inventory APIs
========================= */
app.post("/inventory", async (req, res) => {
  try {
    const { supplier_id, product_name, category, quantity, price } = req.body;

    // Validate required fields
    if (!supplier_id || !product_name || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate supplier
    const supplier = await Supplier.findById(supplier_id);
    if (!supplier) {
      return res.status(400).json({ error: "Invalid supplier" });
    }

    // Validate values
    if (quantity < 0) {
      return res.status(400).json({ error: "Quantity must be >= 0" });
    }

    if (price <= 0) {
      return res.status(400).json({ error: "Price must be > 0" });
    }

    const inventory = await Inventory.create({
      supplier_id,
      product_name,
      category,
      quantity,
      price
    });

    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Inventory
app.get("/inventory", async (req, res) => {
  try {
    const data = await Inventory.find().populate("supplier_id");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   📊 Aggregation
========================= */
app.get("/inventory-summary", async (req, res) => {
  try {
    const result = await Inventory.aggregate([
      {
        $lookup: {
          from: "suppliers",
          localField: "supplier_id",
          foreignField: "_id",
          as: "supplier"
        }
      },
      { $unwind: "$supplier" },

      {
        $group: {
          _id: "$supplier_id",
          supplier_name: { $first: "$supplier.name" },
          total_value: {
            $sum: { $multiply: ["$quantity", "$price"] }
          }
        }
      },

      { $sort: { total_value: -1 } }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   🚀 Server
========================= */
const PORT = process.env.PORT || 4000;

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);