import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import scmsApi from "../../services/scmsApi";

const PRIMARY = "#0052CC";
const PRIMARY_DARK = "#003D99";
const PRIMARY_LIGHT = "#EBF2FF";
const DANGER = "#D92D20";
const BG = "#F6F8FB";
const CARD = "#FFFFFF";
const TEXT = "#1D2939";
const MUTED = "#667085";
const BORDER = "#E4E7EC";

const emptyForm = {
  name: "",
  description: "",
  imageUrl: "",
  unitPrice: "",
  categoryId: "",
};

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

export default function Medicines() {
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";

  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [batches, setBatches] = useState([]);

  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const t = {
    title: lang === "mm" ? "ဆေးဝါးများ" : "Medicines",
    subtitle:
      lang === "mm"
        ? "ဆေးဝါးစာရင်း၊ စျေးနှုန်း၊ ပုံနှင့် stock batch များကို စီမံပါ"
        : "Manage medicine inventory, pricing, images, and stock batches",
    add: lang === "mm" ? "ဆေးအသစ်ထည့်မည်" : "Add Medicine",
    update: lang === "mm" ? "ပြင်ဆင်မည်" : "Update",
    cancel: lang === "mm" ? "မလုပ်တော့ပါ" : "Cancel",
    search: lang === "mm" ? "ဆေးအမည်ဖြင့်ရှာပါ..." : "Search medicines...",
    name: lang === "mm" ? "ဆေးအမည်" : "Medicine Name",
    desc: lang === "mm" ? "ဖော်ပြချက်" : "Description",
    image: lang === "mm" ? "ပုံ URL" : "Image URL",
    price: lang === "mm" ? "စျေးနှုန်း" : "Unit Price",
    category: lang === "mm" ? "အမျိုးအစား" : "Category",
    details: lang === "mm" ? "ဆေးအသေးစိတ်" : "Medicine Details",
    batches: lang === "mm" ? "Batch များ" : "Batches",
    empty: lang === "mm" ? "ဆေးဝါးမတွေ့ပါ" : "No medicines found",
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [medicineRes, categoryRes, batchRes] = await Promise.allSettled([
        scmsApi.medicines.list(),
        scmsApi.medicines.categories(),
        scmsApi.medicines.batches(),
      ]);

      if (medicineRes.status === "fulfilled") {
        setMedicines(getList(medicineRes.value));
      }

      if (categoryRes.status === "fulfilled") {
        setCategories(getList(categoryRes.value));
      }

      if (batchRes.status === "fulfilled") {
        setBatches(getList(batchRes.value));
      }
    } catch (err) {
      console.error("Medicine load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const name = m.name || m.medicineName || "";
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [medicines, search]);

  const getMedicineId = (medicine) =>
    medicine?.medicineId || medicine?.medicine_id || medicine?.id;

  const getCategoryName = (medicine) => {
    const categoryId = medicine?.categoryId || medicine?.category_id;
    const found = categories.find(
      (c) => String(c.id || c.categoryId) === String(categoryId),
    );

    return medicine?.categoryName || found?.name || found?.categoryName || "-";
  };

  const getImage = (medicine) =>
    medicine?.imageUrl ||
    medicine?.image_url ||
    medicine?.image ||
    "https://placehold.co/600x400?text=Medicine";

  const selectedBatches = useMemo(() => {
    if (!selected) return [];

    const id = getMedicineId(selected);

    return batches.filter((b) => {
      const medId = b.medId || b.med_id || b.medicineId || b.medicine_id;
      return String(medId) === String(id);
    });
  }, [batches, selected]);

  const handleInput = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const handleEdit = (medicine) => {
    setEditing(medicine);

    setForm({
      name: medicine.name || medicine.medicineName || "",
      description: medicine.description || "",
      imageUrl: medicine.imageUrl || medicine.image_url || "",
      unitPrice: medicine.unitPrice || medicine.unit_price || "",
      categoryId: medicine.categoryId || medicine.category_id || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const payload = {
        name: form.name,
        description: form.description,
        imageUrl: form.imageUrl,
        unitPrice: Number(form.unitPrice || 0),
        categoryId: form.categoryId ? Number(form.categoryId) : null,
      };

      if (editing) {
        await scmsApi.medicines.update(getMedicineId(editing), payload);
      } else {
        await scmsApi.medicines.create(payload);
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error("Medicine save error:", err);
      alert("Medicine save failed. Please check backend request body.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (medicine) => {
    const ok = confirm(
      lang === "mm"
        ? "ဒီဆေးကိုဖျက်မှာ သေချာလား?"
        : "Are you sure you want to delete this medicine?",
    );

    if (!ok) return;

    try {
      await scmsApi.medicines.remove(getMedicineId(medicine));
      if (selected && getMedicineId(selected) === getMedicineId(medicine)) {
        setSelected(null);
      }
      await loadData();
    } catch (err) {
      console.error("Medicine delete error:", err);
      alert("Delete failed.");
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          marginBottom: 22,
        }}
      >
        <div>
          <h1
            style={{
              color: TEXT,
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            {t.title}
          </h1>
          <p style={{ color: MUTED, marginTop: 6, fontSize: 14 }}>
            {t.subtitle}
          </p>
        </div>

        <button
          onClick={resetForm}
          style={{
            border: 0,
            background: PRIMARY,
            color: "white",
            borderRadius: 12,
            padding: "12px 16px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 8px 18px rgba(0,82,204,0.18)",
          }}
        >
          + {t.add}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 18,
          alignItems: "start",
        }}
      >
        <section>
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              padding: 18,
              marginBottom: 18,
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              style={{
                width: "100%",
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "13px 14px",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: 16,
            }}
          >
            {loading ? (
              <div style={emptyStyle}>Loading...</div>
            ) : filteredMedicines.length === 0 ? (
              <div style={emptyStyle}>{t.empty}</div>
            ) : (
              filteredMedicines.map((medicine) => {
                const id = getMedicineId(medicine);

                return (
                  <article
                    key={id}
                    style={{
                      background: CARD,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 18,
                      overflow: "hidden",
                      boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                      transition: "0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow =
                        "0 14px 28px rgba(16,24,40,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 1px 2px rgba(16,24,40,0.04)";
                    }}
                  >
                    <img
                      src={getImage(medicine)}
                      alt={medicine.name}
                      onClick={() => setSelected(medicine)}
                      style={{
                        width: "100%",
                        height: 150,
                        objectFit: "cover",
                        cursor: "zoom-in",
                        background: BG,
                      }}
                    />

                    <div style={{ padding: 16 }}>
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: TEXT,
                          marginBottom: 5,
                        }}
                      >
                        {medicine.name || medicine.medicineName}
                      </h3>

                      <p
                        style={{
                          color: MUTED,
                          fontSize: 13,
                          lineHeight: 1.5,
                          height: 40,
                          overflow: "hidden",
                        }}
                      >
                        {medicine.description || "-"}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 14,
                        }}
                      >
                        <strong style={{ color: PRIMARY, fontSize: 18 }}>
                          {Number(
                            medicine.unitPrice || medicine.unit_price || 0,
                          ).toLocaleString()}{" "}
                          MMK
                        </strong>

                        <span
                          style={{
                            background: PRIMARY_LIGHT,
                            color: PRIMARY,
                            padding: "5px 9px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {getCategoryName(medicine)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 14,
                        }}
                      >
                        <button
                          onClick={() => handleEdit(medicine)}
                          style={smallBtn}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(medicine)}
                          style={{
                            ...smallBtn,
                            background: "#FFF1F0",
                            color: DANGER,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 18,
            padding: 18,
            position: "sticky",
            top: 24,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 14,
              color: TEXT,
            }}
          >
            {editing
              ? lang === "mm"
                ? "ဆေးပြင်ဆင်ရန်"
                : "Edit Medicine"
              : t.add}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <Input
              label={t.name}
              name="name"
              value={form.name}
              onChange={handleInput}
            />
            <Input
              label={t.image}
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleInput}
            />
            <Input
              label={t.price}
              name="unitPrice"
              value={form.unitPrice}
              onChange={handleInput}
              type="number"
            />

            <label style={labelStyle}>
              {t.category}
              <select
                name="categoryId"
                value={form.categoryId}
                onChange={handleInput}
                style={inputStyle}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option
                    key={c.id || c.categoryId}
                    value={c.id || c.categoryId}
                  >
                    {c.name || c.categoryName}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              {t.desc}
              <textarea
                name="description"
                value={form.description}
                onChange={handleInput}
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </label>

            <button
              disabled={saving}
              style={{
                border: 0,
                background: PRIMARY,
                color: "white",
                borderRadius: 12,
                padding: "12px 16px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : editing ? t.update : t.add}
            </button>

            {editing ? (
              <button type="button" onClick={resetForm} style={cancelBtn}>
                {t.cancel}
              </button>
            ) : null}
          </form>
        </aside>
      </div>

      {selected ? (
        <div
          style={{
            marginTop: 18,
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 18,
            padding: 20,
            display: "grid",
            gridTemplateColumns: "420px 1fr",
            gap: 22,
          }}
        >
          <img
            src={getImage(selected)}
            alt={selected.name}
            style={{
              width: "100%",
              height: 300,
              objectFit: "cover",
              borderRadius: 16,
              background: BG,
            }}
          />

          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: TEXT }}>
              {t.details}
            </h2>

            <h3 style={{ marginTop: 12, fontSize: 22, color: PRIMARY }}>
              {selected.name || selected.medicineName}
            </h3>

            <p style={{ color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
              {selected.description || "-"}
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <Info
                label={t.price}
                value={`${selected.unitPrice || selected.unit_price || 0} MMK`}
              />
              <Info label={t.category} value={getCategoryName(selected)} />
            </div>

            <h3 style={{ marginTop: 22, fontSize: 18, fontWeight: 800 }}>
              {t.batches}
            </h3>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {selectedBatches.length === 0 ? (
                <div style={{ color: MUTED }}>No batch found.</div>
              ) : (
                selectedBatches.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      border: `1px solid ${BORDER}`,
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Batch: {b.batchNo || b.batch_no}</span>
                    <span>Qty: {b.quantity}</span>
                    <span>Status: {b.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label style={labelStyle}>
      {label}
      <input {...props} style={inputStyle} />
    </label>
  );
}

function Info({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 14,
        background: BG,
      }}
    >
      <div style={{ color: MUTED, fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div style={{ color: TEXT, fontSize: 16, fontWeight: 800, marginTop: 5 }}>
        {value}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "grid",
  gap: 6,
  color: TEXT,
  fontSize: 13,
  fontWeight: 800,
};

const inputStyle = {
  width: "100%",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: "11px 12px",
  outline: "none",
  fontSize: 14,
};

const smallBtn = {
  flex: 1,
  border: 0,
  borderRadius: 10,
  padding: "9px 10px",
  background: PRIMARY_LIGHT,
  color: PRIMARY,
  fontWeight: 800,
  cursor: "pointer",
};

const cancelBtn = {
  border: `1px solid ${BORDER}`,
  background: CARD,
  color: TEXT,
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const emptyStyle = {
  gridColumn: "1 / -1",
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 30,
  color: MUTED,
  textAlign: "center",
};
