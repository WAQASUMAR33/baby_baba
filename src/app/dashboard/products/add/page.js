"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AddProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [imageUrls, setImageUrls] = useState([])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [uploadMethod, setUploadMethod] = useState('file') // 'file' or 'url'

  // Form state - aligned with Prisma Product Model
  const [formData, setFormData] = useState({
    // Basic Information
    title: "",
    description: "",

    // Media
    images: [],

    // Pricing
    salePrice: "",
    originalPrice: "",
    costPrice: "",

    // Inventory
    sku: "",
    barcode: "",
    track_quantity: true,
    quantity: "0",
    continue_selling: false,

    // Shipping
    weight: "",
    weightUnit: "kg",
    requires_shipping: true,

    // Variants
    has_variants: false,

    // Product Organization
    productType: "",
    vendor: "",
    categoryId: "",
    tags: "",

    // SEO
    seo_title: "",
    seo_description: "",

    // Status
    status: "draft",
  })

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setLoadingCategories(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || [])

    console.log('📁 Files selected:', files.length)

    if (files.length === 0) {
      console.log('⚠️ No files selected')
      return
    }

    // Validate file types
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/')
      if (!isValid) {
        alert(`${file.name} is not an image file`)
        console.log(`❌ Invalid file type: ${file.name} (${file.type})`)
      } else {
        console.log(`✅ Valid file: ${file.name} (${file.type})`)
      }
      return isValid
    })

    if (validFiles.length === 0) {
      console.log('❌ No valid image files')
      return
    }

    console.log(`📸 Processing ${validFiles.length} valid images`)

    // Add to image files
    setImageFiles(prev => {
      const updated = [...prev, ...validFiles]
      console.log(`📦 Total files: ${updated.length}`)
      return updated
    })

    // Create previews
    validFiles.forEach((file, index) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => {
          const updated = [...prev, {
            file: file.name,
            url: reader.result
          }]
          console.log(`🖼️ Preview created for ${file.name} (${index + 1}/${validFiles.length})`)
          return updated
        })
      }
      reader.onerror = (error) => {
        console.error(`❌ Error reading ${file.name}:`, error)
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()

    console.log('📂 Files dropped')

    const files = Array.from(e.dataTransfer?.files || [])
    console.log(`📥 Dropped ${files.length} files`)

    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    console.log(`🖼️ ${imageFiles.length} image files`)

    if (imageFiles.length > 0) {
      // Trigger the same handler as file input
      const event = {
        target: {
          files: imageFiles
        }
      }
      handleImageUpload(event)
    } else {
      alert('Please drop image files only (JPG, PNG, GIF)')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const addImageUrl = () => {
    if (!imageUrlInput.trim()) return

    // Validate URL
    try {
      new URL(imageUrlInput)
      setImageUrls(prev => [...prev, imageUrlInput.trim()])
      setImageUrlInput('')
    } catch (error) {
      alert('Please enter a valid image URL')
    }
  }

  const removeImageUrl = (index) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImagesToImgur = async (files) => {
    const uploadedImages = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        setError(`Uploading image ${i + 1} of ${files.length} to Imgur...`)
        console.log(`📤 Uploading ${file.name}...`)

        // Convert to base64
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            // Remove the data:image/...;base64, prefix
            const base64String = reader.result.split(',')[1]
            resolve(base64String)
          }
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(file)
        })

        // Upload to Imgur with better error handling
        const response = await fetch('https://api.imgur.com/3/image', {
          method: 'POST',
          headers: {
            'Authorization': 'Client-ID 546c25a59c58ad7',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64,
            type: 'base64',
            name: file.name,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Imgur API error:', response.status, errorText)
          throw new Error(`Imgur upload failed: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.data && data.data.link) {
          uploadedImages.push({
            src: data.data.link,
            alt: file.name,
          })
          console.log(`✅ Uploaded: ${data.data.link}`)
        } else {
          console.error('❌ Imgur response:', data)
          throw new Error(data.data?.error || 'Imgur returned unsuccessful response')
        }
      } catch (error) {
        console.error(`❌ Error uploading ${file.name}:`, error)
        alert(`⚠️ Failed to upload ${file.name}: ${error.message}\n\nTip: Try using "Add by URL" instead!`)
        // Continue with other images instead of stopping
      }
    }

    return uploadedImages
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      // 1. Handle Image Uploads
      let finalImage = ''

      // If we have files to upload
      if (imageFiles.length > 0) {
        console.log('📤 Uploading images...')
        const uploaded = await uploadImagesToImgur(imageFiles)
        if (uploaded.length > 0) {
          finalImage = uploaded[0].src
        }
      }
      // If we have URLs entered manually and no files uploaded (or as fallback)
      else if (imageUrls.length > 0) {
        finalImage = imageUrls[0]
      }

      console.log('🖼️ Main product image:', finalImage)

      // Prepare product data for local database - strict adherence to Prisma Model
      const productData = {
        // Product Model fields
        title: formData.title,
        description: formData.description,
        vendor: formData.vendor,
        productType: formData.productType,
        status: formData.status,
        image: finalImage,
        salePrice: formData.salePrice,
        originalPrice: formData.originalPrice,
        costPrice: formData.costPrice,
        quantity: formData.quantity,
        categoryId: formData.categoryId,

        // Variant fields (will be used by backend to create default variant)
        inventoryQuantity: formData.quantity,
        sku: formData.sku,
        barcode: formData.barcode,
        weight: formData.weight,
        weightUnit: formData.weightUnit,
      }

      console.log('📦 Saving product to database:', productData)

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      })

      const data = await response.json()

      console.log('📬 Response:', data)

      if (data.success) {
        setSuccess(true)
        setError(null)

        alert('✅ Product created successfully in database!')

        // Reset form
        setFormData({
          title: "",
          description: "",
          salePrice: "",
          originalPrice: "",
          costPrice: "",
          sku: "",
          barcode: "",
          track_quantity: true,
          quantity: "0",
          continue_selling: false,
          weight: "",
          weightUnit: "kg",
          requires_shipping: true,
          has_variants: false,
          productType: "",
          vendor: "",
          categoryId: "",
          tags: "",
          seo_title: "",
          seo_description: "",
          status: "draft",
        })
        setImageFiles([])
        setImagePreviews([])
        setImageUrls([])
        setImageUrlInput('')

        // Redirect to products page after 1 second
        setTimeout(() => {
          router.push('/dashboard/products')
        }, 1000)
      } else {
        setError(data.error || 'Failed to create product')
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
            <p className="mt-2 text-sm text-gray-600">
              Create a new product in your database
            </p>
          </div>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Products
          </Link>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Product created successfully! Redirecting...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form - Single Card Layout */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">



        {/* Main "Product Details" Card - Matches User Design */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Title - Full Width */}
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Product Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Product Name"
              />
            </div>

            {/* Vendor */}
            <div>
              <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 mb-2">
                Vendor
              </label>
              <input
                type="text"
                id="vendor"
                name="vendor"
                value={formData.vendor}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Vendor Name"
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Barcode */}
            <div>
              <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-2">
                Barcode
              </label>
              <input
                type="text"
                id="barcode"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ISBN, UPC, GTIN, etc."
              />
            </div>

            {/* Sale Price */}
            <div>
              <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700 mb-2">
                Sale Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="salePrice"
                name="salePrice"
                required
                step="0.01"
                min="0"
                value={formData.salePrice}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
            </div>

            {/* Original Price */}
            <div>
              <label htmlFor="originalPrice" className="block text-sm font-medium text-gray-700 mb-2">
                Original Price
              </label>
              <input
                type="number"
                id="originalPrice"
                name="originalPrice"
                step="0.01"
                min="0"
                value={formData.originalPrice}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
            </div>

            {/* Cost Price */}
            <div>
              <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-2">
                Cost Price
              </label>
              <input
                type="number"
                id="costPrice"
                name="costPrice"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
            </div>

            {/* Quantity */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                Quantity (Stock)
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
            </div>

            {/* Description (Extra field kept for completeness) */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Product description..."
              />
            </div>

            {/* Footer Action Area */}
            <div className="md:col-span-2 flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
              <p className="text-sm text-gray-500">
                Ready to publish?
              </p>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Product'}
              </button>
            </div>

          </div>
        </div>
      </form>
    </div>
  )
}

