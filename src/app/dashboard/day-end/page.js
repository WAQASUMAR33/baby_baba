"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export default function DayEndPage() {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState({
        openingBalance: 0,
        totalExpenses: 0,
        totalSales: 0,
        dailyCash: 0,
        closingBalance: 0,
    });

    // Fetch data when date changes
    useEffect(() => {
        fetchDayEndData(date);
    }, [date]);

    const fetchDayEndData = async (selectedDate) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/day-end?date=${selectedDate}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            const result = await res.json();

            setData({
                openingBalance: parseFloat(result.openingBalance) || 0,
                totalExpenses: parseFloat(result.totalExpenses) || 0,
                totalSales: parseFloat(result.totalSales) || 0,
                dailyCash: parseFloat(result.dailyCash) || 0,
                closingBalance: parseFloat(result.closingBalance) || 0,
            });

            // Recalculate closing balance initially if it's 0 (new record)
            if (result.id === null) {
                calculateClosing({
                    ...result,
                    openingBalance: parseFloat(result.openingBalance) || 0,
                    totalExpenses: parseFloat(result.totalExpenses) || 0,
                });
            }

        } catch (error) {
            console.error(error);
            toast.error("Error loading day end data");
        } finally {
            setLoading(false);
        }
    };

    const calculateClosing = (currentData) => {
        const opening = parseFloat(currentData.openingBalance) || 0;
        const sales = parseFloat(currentData.totalSales) || 0;
        const expenses = parseFloat(currentData.totalExpenses) || 0;

        // Formula: Opening + Sales - Expenses
        const closing = opening + sales - expenses;

        setData(prev => ({
            ...prev,
            ...currentData,
            closingBalance: closing
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Allow empty string for better typing experience, convert to 0 for calc
        const numValue = value === "" ? 0 : parseFloat(value);

        const requestData = {
            ...data,
            [name]: numValue
        };

        // Update state directly with value (to allow typing) is a bit tricky with calc
        // simpler to rely on render with re-calc

        // Better approach: update specific field, then recalc
        const updatedData = { ...data, [name]: value }; // keep as string or whatever input is
        setData(updatedData);

        calculateClosing({
            ...data,
            [name]: numValue
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                date,
                openingBalance: parseFloat(data.openingBalance),
                totalExpenses: parseFloat(data.totalExpenses),
                totalSales: parseFloat(data.totalSales) || 0,
                dailyCash: parseFloat(data.dailyCash) || 0,
                closingBalance: parseFloat(data.closingBalance),
            };

            const res = await fetch("/api/day-end", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to save");

            toast.success("Day End saved successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save day end");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Day End Closing</h1>

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
                <div>Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Read Only Section */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <h2 className="font-semibold mb-4 text-gray-700">System Data</h2>

                        <div className="mb-4">
                            <label className="block text-sm text-gray-500">Opening Balance</label>
                            <div className="text-xl font-bold">
                                Rs. {data.openingBalance?.toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-400">From previous day closing</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm text-gray-500">Total Expenses</label>
                            <div className="text-xl font-bold text-red-600">
                                Rs. {data.totalExpenses?.toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-400">Logged expenses for {date}</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm text-gray-500">Total Sales (System)</label>
                            <div className="text-xl font-bold text-green-600">
                                Rs. {data.totalSales?.toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-400">Completed sales for {date}</p>
                        </div>
                    </div>

                    {/* Input Section */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h2 className="font-semibold mb-4 text-blue-600">Enter Details</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Daily Cash (In Hand)</label>
                            <input
                                type="number"
                                name="dailyCash"
                                value={data.dailyCash}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                            />
                            <p className="text-xs text-gray-400 mt-1">Physical cash counted</p>
                        </div>
                    </div>

                    {/* Summary Section */}
                    <div className="md:col-span-2 bg-blue-50 p-6 rounded-lg border border-blue-100 flex flex-col items-center justify-center">
                        <h3 className="text-lg font-medium text-blue-800 mb-2">Calculated Closing Balance</h3>
                        <div className="text-4xl font-bold text-blue-900">
                            Rs. {data.closingBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-sm text-blue-600 mt-2">
                            (Opening + Sales) - Expenses
                        </p>
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg transition-colors disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Day End"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
