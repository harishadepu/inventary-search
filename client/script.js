const API = "http://localhost:4000";

  // Load all data on page load
  window.onload = () => {
    search();
  };

  async function search() {
    const q = document.getElementById("q").value;
    const category = document.getElementById("category").value;
    const minPrice = document.getElementById("minPrice").value;
    const maxPrice = document.getElementById("maxPrice").value;

    const errorEl = document.getElementById("error");
    const resultsEl = document.getElementById("results");

    errorEl.innerText = "";
    resultsEl.innerHTML = "<p>Loading...</p>";

    // Validate price
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      errorEl.innerText = "Invalid price range";
      resultsEl.innerHTML = "";
      return;
    }

    try {
      const params = new URLSearchParams();

      if (q) params.append("q", q);
      if (category) params.append("category", category);
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);

      const res = await fetch(`${API}/search?${params}`);
      const data = await res.json();

      console.log(data); // debug

      resultsEl.innerHTML = "";

      if (!data || data.length === 0) {
        resultsEl.innerHTML = "<p class='no-data'>No results found</p>";
        return;
      }

      data.forEach(item => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
          <strong>${item.product_name}</strong><br>
          Category: ${item.category}<br>
          Quantity: ${item.quantity}<br>
          Price: ₹${item.price}
        `;

        resultsEl.appendChild(div);
      });

    } catch (err) {
      console.error(err);
      errorEl.innerText = "Failed to fetch data";
      resultsEl.innerHTML = "";
    }
  }