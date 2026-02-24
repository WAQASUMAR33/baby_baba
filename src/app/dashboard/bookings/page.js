"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"

export default function BookingsPage() {
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [customerSearch, setCustomerSearch] = useState("")
  const [cutterSearch, setCutterSearch] = useState("")
  const [tailorSearch, setTailorSearch] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedCutterId, setSelectedCutterId] = useState("")
  const [selectedTailorId, setSelectedTailorId] = useState("")

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [customersRes, employeesRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/employees"),
        ])
        const customersData = await customersRes.json()
        const employeesData = await employeesRes.json()
        if (customersData.success) {
          setCustomers(customersData.customers || [])
        } else {
          toast.error(customersData.error || "Failed to load customers")
        }
        if (employeesData.success) {
          setEmployees(employeesData.employees || [])
        } else {
          toast.error(employeesData.error || "Failed to load employees")
        }
      } catch (error) {
        toast.error(error.message || "Failed to load booking data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((customer) => {
      const name = customer.name?.toLowerCase() || ""
      const phone = customer.phoneNumber?.toLowerCase() || ""
      return name.includes(term) || phone.includes(term)
    })
  }, [customers, customerSearch])

  const filteredCutters = useMemo(() => {
    const term = cutterSearch.trim().toLowerCase()
    if (!term) return employees
    return employees.filter((employee) => {
      const name = employee.name?.toLowerCase() || ""
      const phone = employee.phoneNumber?.toLowerCase() || ""
      return name.includes(term) || phone.includes(term)
    })
  }, [employees, cutterSearch])

  const filteredTailors = useMemo(() => {
    const term = tailorSearch.trim().toLowerCase()
    if (!term) return employees
    return employees.filter((employee) => {
      const name = employee.name?.toLowerCase() || ""
      const phone = employee.phoneNumber?.toLowerCase() || ""
      return name.includes(term) || phone.includes(term)
    })
  }, [employees, tailorSearch])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Select customer, cutter, and tailor with searchable dropdowns.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div className="text-sm text-gray-500">Loading booking data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name or phone"
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select customer</option>
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.phoneNumber ? `(${customer.phoneNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cutter</label>
              <input
                type="text"
                value={cutterSearch}
                onChange={(e) => setCutterSearch(e.target.value)}
                placeholder="Search by name or phone"
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={selectedCutterId}
                onChange={(e) => setSelectedCutterId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select cutter</option>
                {filteredCutters.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} {employee.phoneNumber ? `(${employee.phoneNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tailor</label>
              <input
                type="text"
                value={tailorSearch}
                onChange={(e) => setTailorSearch(e.target.value)}
                placeholder="Search by name or phone"
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={selectedTailorId}
                onChange={(e) => setSelectedTailorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select tailor</option>
                {filteredTailors.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} {employee.phoneNumber ? `(${employee.phoneNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
