// Income Expense Calculator
// - CRUD operations
// - Filters: all | income | expense
// - Totals: income, expense, net
// - localStorage persistence
// - Responsive UI and inline editing

const LS_KEY = "income_expense_entries_v1";

const state = {
  entries: loadEntries(),
  filter: "all",
};

const els = {
  totalIncome: document.getElementById("totalIncome"),
  totalExpense: document.getElementById("totalExpense"),
  netBalance: document.getElementById("netBalance"),
  entryForm: document.getElementById("entryForm"),
  description: document.getElementById("description"),
  amount: document.getElementById("amount"),
  resetBtn: document.getElementById("resetBtn"),
  entryList: document.getElementById("entryList"),
  emptyState: document.getElementById("emptyState"),
  filterAll: document.getElementById("filter-all"),
  filterIncome: document.getElementById("filter-income"),
  filterExpense: document.getElementById("filter-expense"),
};

// Init
render();

els.entryForm.addEventListener("submit", onAdd);
els.resetBtn.addEventListener("click", onReset);

els.filterAll.addEventListener("change", () => setFilter("all"));
els.filterIncome.addEventListener("change", () => setFilter("income"));
els.filterExpense.addEventListener("change", () => setFilter("expense"));

function onAdd(e) {
  e.preventDefault();
  const formData = new FormData(els.entryForm);
  const type = formData.get("type");
  const description = String(formData.get("description") || "").trim();
  const amountRaw = String(formData.get("amount") || "").trim();
  const amount = Number(amountRaw);

  if (!description) {
    alert("Please enter a description.");
    return;
  }
  if (!amountRaw || isNaN(amount) || amount <= 0) {
    alert("Please enter a valid positive amount.");
    return;
  }
  if (type !== "income" && type !== "expense") {
    alert("Please select a valid type.");
    return;
  }

  const entry = {
    id: crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2),
    type,
    description,
    amount: Number(amount.toFixed(2)),
    createdAt: Date.now(),
  };

  state.entries.unshift(entry);
  saveEntries(state.entries);
  els.entryForm.reset();
  document.getElementById(`type-${type}`).checked = true;
  render();
}

function onReset() {
  els.entryForm.reset();
  document.getElementById("type-income").checked = true;
}

function setFilter(next) {
  state.filter = next;
  render();
}

function render() {
  const filtered = state.entries.filter((e) => {
    if (state.filter === "all") return true;
    return e.type === state.filter;
  });

  // Totals
  const income = state.entries.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
  const expense = state.entries.filter((e) => e.type === "expense").reduce((sum, e) => sum + e.amount, 0);
  const net = income - expense;

  els.totalIncome.textContent = `₹${formatAmount(income)}`;
  els.totalExpense.textContent = `₹${formatAmount(expense)}`;
  els.netBalance.textContent = `₹${formatAmount(net)}`;
  els.netBalance.classList.toggle("positive", net >= 0);
  els.netBalance.classList.toggle("negative", net < 0);

  // List
  els.entryList.innerHTML = "";
  if (filtered.length === 0) {
    els.emptyState.style.display = "block";
  } else {
    els.emptyState.style.display = "none";
    filtered.forEach((entry) => {
      els.entryList.appendChild(renderItem(entry));
    });
  }
}

function renderItem(entry) {
  const li = document.createElement("li");
  li.className = "entry-item";
  li.dataset.id = entry.id;

  const left = document.createElement("div");
  const title = document.createElement("div");
  title.textContent = entry.description;

  const meta = document.createElement("div");
  meta.className = "badge";
  meta.textContent = capitalize(entry.type);

  left.append(title, meta);

  const amount = document.createElement("div");
  amount.className = `amount ${entry.type}`;
  amount.textContent = `₹${formatAmount(entry.amount)}`;

  const actions = document.createElement("div");
  actions.className = "actions";

  const editBtn = document.createElement("button");
  editBtn.className = "icon-btn";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => startInlineEdit(li, entry));

  const delBtn = document.createElement("button");
  delBtn.className = "icon-btn";
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", () => onDelete(entry.id));

  actions.append(editBtn, delBtn);

  li.append(left, amount, actions);
  return li;
}

function startInlineEdit(li, entry) {
  li.innerHTML = "";

  // description
  const descInput = document.createElement("input");
  descInput.type = "text";
  descInput.value = entry.description;
  descInput.maxLength = 60;

  // amount
  const amountInput = document.createElement("input");
  amountInput.type = "number";
  amountInput.step = "0.01";
  amountInput.min = "0";
  amountInput.value = entry.amount;

  // type toggle
  const typeSelect = document.createElement("select");
  const optIncome = document.createElement("option");
  optIncome.value = "income";
  optIncome.textContent = "Income";
  const optExpense = document.createElement("option");
  optExpense.value = "expense";
  optExpense.textContent = "Expense";
  typeSelect.append(optIncome, optExpense);
  typeSelect.value = entry.type;

  // actions
  const saveBtn = document.createElement("button");
  saveBtn.className = "icon-btn";
  saveBtn.textContent = "Save";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "icon-btn";
  cancelBtn.textContent = "Cancel";

  const wrapper = document.createElement("div");
  wrapper.className = "inline-edit";
  wrapper.append(descInput, amountInput, typeSelect, saveBtn, cancelBtn);
  li.appendChild(wrapper);

  saveBtn.addEventListener("click", () => {
    const description = String(descInput.value || "").trim();
    const amount = Number(amountInput.value);
    const type = typeSelect.value;

    if (!description) return alert("Description cannot be empty.");
    if (!amount || isNaN(amount) || amount <= 0) return alert("Enter a valid positive amount.");
    if (type !== "income" && type !== "expense") return alert("Select a valid type.");

    // Update
    const idx = state.entries.findIndex((e) => e.id === entry.id);
    if (idx !== -1) {
      state.entries[idx] = {
        ...state.entries[idx],
        description,
        amount: Number(amount.toFixed(2)),
        type,
      };
      saveEntries(state.entries);
      render();
    }
  });

  cancelBtn.addEventListener("click", () => {
    // restore original row
    const restored = renderItem(entry);
    li.replaceWith(restored);
  });
}

function onDelete(id) {
  const ok = confirm("Delete this entry?");
  if (!ok) return;
  state.entries = state.entries.filter((e) => e.id !== id);
  saveEntries(state.entries);
  render();
}

// Storage
function loadEntries() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((e) => ({
      id: String(e.id),
      type: e.type === "expense" ? "expense" : "income",
      description: String(e.description || ""),
      amount: Number(e.amount) || 0,
      createdAt: Number(e.createdAt) || Date.now(),
    }));
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}

// Utils
function formatAmount(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function capitalize(s) {
  return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
}
