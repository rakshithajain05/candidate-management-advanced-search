
import React, { useMemo, useState, useCallback, useRef } from "react";
import { FixedSizeList as List } from "react-window";
import Modal from "react-modal";

// Mock data generator
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const STAGES = ["Applied", "Phone Screen", "Interview", "Offer", "Hired", "Rejected"];
const COMPANIES = ["Google", "Microsoft", "Amazon", "Meta", "Fractal", "Bose"];
const JOB_TITLES = ["Frontend Engineer", "Backend Engineer", "Fullstack Engineer", "SDE Intern", "Data Scientist"];
const EDUCATIONS = ["B.Tech", "M.Tech", "B.Sc", "MCA", "PhD"];

function makeCandidate(id) {
  const jobsCount = randomInt(1, 4);
  const jobs = Array.from({ length: jobsCount }).map((_, i) => ({
    id: `${id}-job-${i}`,
    title: JOB_TITLES[randomInt(0, JOB_TITLES.length - 1)],
    company: COMPANIES[randomInt(0, COMPANIES.length - 1)],
  }));

  const eduCount = randomInt(1, 3);
  const education = Array.from({ length: eduCount }).map(() => EDUCATIONS[randomInt(0, EDUCATIONS.length - 1)]);

  const expectedSalary = 300000 + randomInt(0, 70) * 10000;
  const appliedDate = new Date(Date.now() - randomInt(0, 365) * 24 * 3600 * 1000).toISOString().slice(0, 10);

  return {
    id: `cand-${id}`,
    name: `Candidate ${id}`,
    email: `candidate${id}@example.com`,
    mobile: `+91${randomInt(6000000000, 9999999999)}`,
    jobsAssociated: jobs,
    currentStage: STAGES[randomInt(0, STAGES.length - 1)],
    currentCompany: COMPANIES[randomInt(0, COMPANIES.length - 1)],
    education,
    appliedDate,
    expectedSalary,
    reviewed: Math.random() < 0.2,
  };
}

// Main App Component
export default function App() {
  // large dataset
  const [data, setData] = useState(() => {
    const N = 10000; // simulate large dataset
    return Array.from({ length: N }, (_, i) => makeCandidate(i + 1));
  });

  const [filters, setFilters] = useState({ name: "", company: "", stage: "", minSalary: "", maxSalary: "" });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [sortBy, setSortBy] = useState({ key: null, dir: 1 });
  const [selected, setSelected] = useState(new Set());
  const [modalCandidate, setModalCandidate] = useState(null);

  // Inline edit state
  const inlineEditRef = useRef({});

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    setFilters({ name: "", company: "", stage: "", minSalary: "", maxSalary: "" });
    setAppliedFilters(null);
  };

  const filtered = useMemo(() => {
    let result = data;
    const f = appliedFilters;
    if (!f) return result;
    if (f.name) result = result.filter((r) => r.name.toLowerCase().includes(f.name.toLowerCase()));
    if (f.company) result = result.filter((r) => r.currentCompany === f.company);
    if (f.stage) result = result.filter((r) => r.currentStage === f.stage);
    if (f.minSalary) result = result.filter((r) => r.expectedSalary >= Number(f.minSalary));
    if (f.maxSalary) result = result.filter((r) => r.expectedSalary <= Number(f.maxSalary));

    if (sortBy.key) {
      const key = sortBy.key;
      result = [...result].sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        if (typeof va === "string") return va.localeCompare(vb) * sortBy.dir;
        return (va - vb) * sortBy.dir;
      });
    }

    return result;
  }, [data, appliedFilters, sortBy]);

  const toggleSort = (key) => {
    setSortBy((s) => {
      if (s.key === key) return { key, dir: -s.dir };
      return { key, dir: 1 };
    });
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(filtered.slice(0, 1000).map((r) => r.id))); // example: select first 1000 visible
  };

  const clearSelection = () => setSelected(new Set());

  const bulkChangeStage = (stage) => {
    if (selected.size === 0) return;
    setData((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, currentStage: stage } : r)));
    // clear selection after action
    setSelected(new Set());
  };

  const bulkMarkReviewed = () => {
    if (selected.size === 0) return;
    setData((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, reviewed: true } : r)));
    setSelected(new Set());
  };

  const saveInlineEdit = (id, field, value) => {
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  // Row renderer
  const Row = useCallback(
    ({ index, style }) => {
      const item = filtered[index];
      if (!item) return null;

      return (
        <div
          style={style}
          className={`grid grid-cols-12 gap-2 items-center px-3 py-2 border-b hover:bg-gray-50 cursor-pointer`}
          onClick={(e) => {
            // avoid modal open when clicking on checkbox or inline input
            if (e.target.closest("input")) return;
            setModalCandidate(item);
          }}
        >
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelect(item.id);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="col-span-2 font-medium">{item.name}</div>
          <div className="col-span-2 text-sm">{item.email}</div>
          <div className="col-span-1 text-sm">{item.mobile}</div>
          <div className="col-span-2 text-sm">
            <MultiList items={item.jobsAssociated.map((j) => j.title + " @ " + j.company)} />
          </div>
          <div className="col-span-1 text-sm">{item.currentCompany}</div>
          <div className="col-span-1 text-sm">
            <InlineSelect
              value={item.currentStage}
              options={STAGES}
              onSave={(val) => saveInlineEdit(item.id, "currentStage", val)}
            />
          </div>
          <div className="col-span-1 text-sm">
            <InlineNumber
              value={item.expectedSalary}
              onSave={(val) => saveInlineEdit(item.id, "expectedSalary", Number(val))}
            />
          </div>
        </div>
      );
    },
    [filtered, selected]
  );

  return (
    <div className="p-4 min-h-screen bg-white">
      <h1 className="text-2xl font-bold mb-4">Advanced Search & Candidate Table</h1>
      <div className="flex gap-4">
        {/* Filter Panel */}
        <div className="w-80 p-4 border rounded">
          <h2 className="font-semibold mb-2">Filters</h2>
          <div className="space-y-2">
            <label className="block">
              <div className="text-sm">Name</div>
              <input value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} className="w-full input" />
            </label>

            <label className="block">
              <div className="text-sm">Company</div>
              <select value={filters.company} onChange={(e) => setFilters({ ...filters, company: e.target.value })} className="w-full input">
                <option value="">-- any --</option>
                {COMPANIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-sm">Stage</div>
              <select value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })} className="w-full input">
                <option value="">-- any --</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <div className="flex gap-2">
              <div className="w-1/2">
                <div className="text-sm">Min Salary</div>
                <input type="number" value={filters.minSalary} onChange={(e) => setFilters({ ...filters, minSalary: e.target.value })} className="w-full input" />
              </div>
              <div className="w-1/2">
                <div className="text-sm">Max Salary</div>
                <input type="number" value={filters.maxSalary} onChange={(e) => setFilters({ ...filters, maxSalary: e.target.value })} className="w-full input" />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button className="btn" onClick={applyFilters}>Search</button>
              <button className="btn-secondary" onClick={clearFilters}>Clear</button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="btn" onClick={selectAllVisible}>Select Visible</button>
              <button className="btn-secondary" onClick={clearSelection}>Clear Selection</button>

              <select onChange={(e) => bulkChangeStage(e.target.value)} className="input w-40">
                <option value="">Bulk Change Stage</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button className="btn" onClick={bulkMarkReviewed}>Mark Reviewed</button>
            </div>

            <div className="text-sm">Showing {filtered.length > 0 ? `1 - ${Math.min(filtered.length, 50)}` : 0} of {filtered.length} candidates</div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 border-b font-semibold">
            <div className="col-span-1">Select</div>
            <div className="col-span-2 cursor-pointer" onClick={() => toggleSort("name")}>Name</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-1">Mobile</div>
            <div className="col-span-2">Jobs Associated</div>
            <div className="col-span-1">Company</div>
            <div className="col-span-1 cursor-pointer" onClick={() => toggleSort("currentStage")}>Stage</div>
            <div className="col-span-1 cursor-pointer" onClick={() => toggleSort("expectedSalary")}>Exp Salary</div>
          </div>

          {/* Virtualized list */}
          {filtered.length === 0 ? (
            <div className="p-6 text-center">No results. Try changing filters.</div>
          ) : (
            <List height={600} itemCount={filtered.length} itemSize={64} width={'100%'}>
              {Row}
            </List>
          )}

          {/* Footer */}
          <div className="mt-2 p-2 border-t flex justify-between items-center">
            <div className="text-sm">{selected.size} selected</div>
            <div className="text-sm">Showing {filtered.length > 0 ? `1 - ${Math.min(filtered.length, 50)}` : 0} of {filtered.length} candidates</div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={!!modalCandidate} onRequestClose={() => setModalCandidate(null)} ariaHideApp={false} className="max-w-3xl mx-auto mt-20 bg-white p-4 rounded shadow-lg">
        {modalCandidate && (
          <div>
            <h2 className="text-xl font-bold">{modalCandidate.name}</h2>
            <p>{modalCandidate.email} • {modalCandidate.mobile}</p>
            <div className="mt-2">
              <h3 className="font-semibold">Jobs</h3>
              <ul className="list-disc ml-6">
                {modalCandidate.jobsAssociated.map((j) => (
                  <li key={j.id}>{j.title} @ {j.company}</li>
                ))}
              </ul>
            </div>
            <div className="mt-2">
              <h3 className="font-semibold">Education</h3>
              <div>{modalCandidate.education.join(", ")}</div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setModalCandidate(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Small helper components
function MultiList({ items = [] }) {
  const [open, setOpen] = useState(false);
  if (items.length <= 2) return <div>{items.join(", ")}</div>;
  return (
    <div>
      {open ? (
        <div>
          {items.join(", ")} <button className="text-xs ml-2" onClick={() => setOpen(false)}>View Less</button>
        </div>
      ) : (
        <div>
          {items.slice(0, 2).join(", ")}... <button className="text-xs ml-2" onClick={() => setOpen(true)}>View More</button>
        </div>
      )}
    </div>
  );
}

function InlineSelect({ value, options, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  return editing ? (
    <div onClick={(e) => e.stopPropagation()}>
      <select className="input text-sm" value={val} onChange={(e) => setVal(e.target.value)} onBlur={() => { setEditing(false); onSave(val); }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  ) : (
    <div onClick={(e) => { e.stopPropagation(); setEditing(true); }}>{value}</div>
  );
}

function InlineNumber({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  return editing ? (
    <input
      type="number"
      className="input text-sm"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => { setEditing(false); const n = Number(val); if (!Number.isFinite(n) || n < 0) { alert("Invalid salary"); return; } onSave(n); }}
      onClick={(e) => e.stopPropagation()}
      autoFocus
    />
  ) : (
    <div onClick={(e) => { e.stopPropagation(); setEditing(true); }}>{value}</div>
  );
}
