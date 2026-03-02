"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

const fmt = (v) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (v) => {
    const d = new Date(v);
    const utc = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return utc.toLocaleDateString("en-GB");
};

export default function DayEndPage() {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [data, setData] = useState(null);
    const [withdrawAmount, setWithdrawAmount] = useState("");

    useEffect(() => { fetchDayEndData(date); }, [date]);
    useEffect(() => { fetchHistory(); }, []);

    const fetchDayEndData = async (d) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/day-end?date=${d}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const result = await res.json();
            setData(result);
            setWithdrawAmount(result.id ? String(parseFloat(result.withdrawAmount) || "") : "");
        } catch (err) {
            console.error(err);
            toast.error("Error loading day end data");
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch("/api/day-end");
            if (!res.ok) throw new Error("Failed");
            const result = await res.json();
            setHistory(Array.isArray(result.records) ? result.records : []);
        } catch (err) {
            console.error(err);
            toast.error("Error loading history");
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSave = async () => {
        if (!data) return;
        setSaving(true);
        try {
            const res = await fetch("/api/day-end", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date,
                    openingBalance: data.openingBalance,
                    totalExpenses:  data.totalExpenses,
                    totalSales:     data.totalSales,
                    cashSales:      data.cashSales,
                    withdrawAmount: parseFloat(withdrawAmount) || 0,
                }),
            });
            if (!res.ok) throw new Error("Failed to save");
            toast.success("Day End saved");
            fetchDayEndData(date);
            fetchHistory();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save day end");
        } finally {
            setSaving(false);
        }
    };

    // Derived values
    const openingBalance = parseFloat(data?.openingBalance || 0);
    const totalSales     = parseFloat(data?.totalSales     || 0);
    const cashSales      = parseFloat(data?.cashSales      || 0);
    const cardOtherSales = totalSales - cashSales;
    const totalExpenses  = parseFloat(data?.totalExpenses  || 0);
    const withdraw       = parseFloat(withdrawAmount) || 0;
    // closing = opening + expenses + sales - withdraw
    const closingBalance = parseFloat((openingBalance + totalExpenses + totalSales - withdraw).toFixed(2));

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Day End Closing</h1>

            {/* Date picker */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Select Date</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="p-2 border rounded-md"
                />
            </div>

            {loading ? (
                <div className="text-gray-500">Loading...</div>
            ) : data ? (
                <div className="space-y-6">

                    {/* ── Row 1: System data ───────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard label="Opening Balance" value={openingBalance} note="Previous day closing" />
                        <StatCard label="Total Sales" value={totalSales} color="green" note={`Cash: Rs. ${fmt(cashSales)}  |  Card/Other: Rs. ${fmt(cardOtherSales)}`} />
                        <StatCard label="Total Expenses" value={totalExpenses} color="red" note={`Logged expenses for ${date}`} />
                    </div>

                    {/* ── Row 2: Withdraw input ────────────────────────── */}
                    <div className="bg-white rounded-lg border shadow-sm p-5 max-w-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Withdraw Amount
                        </label>
                        <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full p-3 border rounded-lg text-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            placeholder="0.00"
                            min="0"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            Amount withdrawn (deducted from closing balance).
                        </p>
                    </div>

                    {/* ── Row 3: Closing balance summary ──────────────── */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 flex flex-col items-center">
                        <h3 className="text-lg font-medium text-blue-800 mb-1">Closing Balance</h3>
                        <p className="text-4xl font-bold text-blue-900">Rs. {fmt(closingBalance)}</p>
                        <p className="text-sm text-blue-600 mt-2">
                            Opening ({fmt(openingBalance)}) + Expenses ({fmt(totalExpenses)}) + Sales ({fmt(totalSales)}) − Withdraw ({fmt(withdraw)})
                        </p>
                    </div>

                    {/* ── Save button ──────────────────────────────────── */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium shadow transition-colors disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Day End"}
                        </button>
                    </div>

                    {/* ── History table ────────────────────────────────── */}
                    <div className="bg-white rounded-lg border shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-lg font-semibold text-gray-800">Day End History</h2>
                            {historyLoading && <span className="text-sm text-gray-500">Loading…</span>}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left  font-medium">Date</th>
                                        <th className="px-4 py-3 text-right font-medium">Opening</th>
                                        <th className="px-4 py-3 text-right font-medium">Sales</th>
                                        <th className="px-4 py-3 text-right font-medium">Expenses</th>
                                        <th className="px-4 py-3 text-right font-medium">Withdraw</th>
                                        <th className="px-4 py-3 text-right font-medium">Closing</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {history.length === 0 ? (
                                        <tr>
                                            <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                                                No day end records yet
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((r) => (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-700">{fmtDate(r.date)}</td>
                                                <td className="px-4 py-3 text-right text-gray-700">Rs. {fmt(r.openingBalance)}</td>
                                                <td className="px-4 py-3 text-right text-green-700">Rs. {fmt(r.totalSales)}</td>
                                                <td className="px-4 py-3 text-right text-red-600">Rs. {fmt(r.totalExpenses)}</td>
                                                <td className="px-4 py-3 text-right text-orange-600">Rs. {fmt(r.withdrawAmount)}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-900">Rs. {fmt(r.closingBalance)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function StatCard({ label, value, note, color }) {
    const colorClass = color === "green" ? "text-green-700" : color === "red" ? "text-red-600" : "text-gray-800";
    return (
        <div className="bg-white rounded-lg border p-4 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${colorClass}`}>Rs. {fmt(value)}</p>
            {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
        </div>
    );
}
