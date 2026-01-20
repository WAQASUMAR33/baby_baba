"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AddProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [collections, setCollections] = useState([])
  const [loadingCollections, setLoadingCollections] = useState(true)
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [imageUrls, setImageUrls] = useState([])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [uploadMethod, setUploadMethod] = useState('file') // 'file' or 'url'

  // Form state - following Shopify's structure
  const [formData, setFormData] = useState({
    // Basic Information
    title: "",
    description: "",

    // Media
    images: [],

    // Pricing
    price: "",
    compare_at_price: "",
    cost_per_item: "",

    // Inventory
    sku: "",
    barcode: "",
    track_quantity: true,
    inventory_quantity: "0",
    continue_selling: false,

    // Shipping
    weight: "",
    weight_unit: "kg",
    requires_shipping: true,

    // Variants
    has_variants: false,

    // Product Organization
    product_type: "",
    vendor: "",
    collections: [],
    tags: "",

    // SEO
    seo_title: "",
    seo_description: "",

    // Status
    status: "draft",
  })

  // Fetch collections on mount
  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      setLoadingCollections(true)
      const response = await fetch('/api/shopify/collections')
      const data = await response.json()
      if (data.success) {
        setCollections(data.collections || [])
      }
    } catch (err) {
      console.error('Error fetching collections:', err)
    } finally {
      setLoadingCollections(false)
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
      // Prepare product data for local database
      const productData = {
        title: formData.title,
        description: formData.description,
        vendor: formData.vendor,
        product_type: formData.product_type,
        status: formData.status,
        price: formData.price,
        compare_at_price: formData.compare_at_price,
        cost_per_item: formData.cost_per_item,
        sku: formData.sku,
        barcode: formData.barcode,
        inventory_quantity: formData.inventory_quantity,
        weight: formData.weight,
        weight_unit: formData.weight_unit,
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
          price: "",
          compare_at_price: "",
          cost_per_item: "",
          sku: "",
          barcode: "",
          track_quantity: true,
          inventory_quantity: "0",
          continue_selling: false,
          weight: "",
          weight_unit: "kg",
          requires_shipping: true,
          has_variants: false,
          product_type: "",
          vendor: "",
          collections: [],
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

      {/* Form - Shopify Style Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">

          {/* Title and Description */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Short sleeve t-shirt"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Product description..."
                />
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Media</h3>

            {/* Upload Method Tabs */}
            <div className="flex space-x-2 mb-4">
              <button
                type="button"
                onClick={() => setUploadMethod('file')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploadMethod === 'file'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                📤 Upload Files
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod('url')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploadMethod === 'url'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                🔗 Add by URL
              </button>
            </div>

            {/* File Upload Method */}
            {uploadMethod === 'file' && (
              <>
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Area */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors"
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer inline-block">
                      <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Choose Files
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        accept="image/*,image/png,image/jpeg,image/jpg,image/gif"
                        onChange={handleImageUpload}
                        onClick={(e) => {
                          console.log('🖱️ File input clicked')
                          // Reset value to allow selecting same file again
                          e.target.value = null
                        }}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">or drag and drop images here</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 10MB</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">ℹ️ Images will upload when you click &quot;Save Product&quot;</p>
                  <p className="text-xs text-green-600 mt-1 font-medium">💡 Tip: Use &quot;Add by URL&quot; tab for instant uploads (no waiting)</p>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800 font-medium">
                      ✅ {imagePreviews.length} image(s) ready to upload
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Images will upload to Imgur when you click &quot;Save Product&quot; button
                    </p>
                  </div>
                )}
              </>
            )}

            {/* URL Upload Method */}
            {uploadMethod === 'url' && (
              <>
                {/* URL Images List */}
                {imageUrls.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                        <img
                          src={url}
                          alt={`URL ${index + 1}`}
                          className="w-16 h-16 object-cover rounded border border-gray-300"
                          onError={(e) => e.target.src = 'https://via.placeholder.com/64?text=Invalid'}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 truncate">{url}</p>
                          {index === 0 && (
                            <span className="inline-block text-xs text-blue-600 font-medium">Primary Image</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImageUrl(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* URL Input */}
                <div className="border-2 border-gray-300 rounded-lg p-6">
                  <label htmlFor="image-url" className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      id="image-url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={addImageUrl}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ✅ Recommended: Paste direct image URLs from your website, CDN, or image hosting service
                  </p>
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    💡 Tip: Right-click an image online → &quot;Copy image address&quot;
                  </p>
                </div>

                {imageUrls.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {imageUrls.length} image URL(s) added. First image will be the primary image.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Pricing */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-semibold">Rs</span>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="compare_at_price" className="block text-sm font-medium text-gray-700 mb-2">
                  Compare-at price
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-semibold">Rs</span>
                  <input
                    type="number"
                    id="compare_at_price"
                    name="compare_at_price"
                    step="0.01"
                    min="0"
                    value={formData.compare_at_price}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cost_per_item" className="block text-sm font-medium text-gray-700 mb-2">
                  Cost per item
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-semibold">Rs</span>
                  <input
                    type="number"
                    id="cost_per_item"
                    name="cost_per_item"
                    step="0.01"
                    min="0"
                    value={formData.cost_per_item}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Customers won&apos;t see the cost per item. This is for internal use only.
            </p>
          </div>

          {/* Inventory */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Inventory</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
                    SKU (Stock Keeping Unit)
                  </label>
                  <input
                    type="text"
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="SKU"
                  />
                </div>

                <div>
                  <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-2">
                    Barcode (ISBN, UPC, GTIN, etc.)
                  </label>
                  <input
                    type="text"
                    id="barcode"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Barcode"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="track_quantity"
                  name="track_quantity"
                  checked={formData.track_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, track_quantity: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="track_quantity" className="ml-2 block text-sm text-gray-700">
                  Track quantity
                </label>
              </div>

              {formData.track_quantity && (
                <>
                  <div>
                    <label htmlFor="inventory_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      id="inventory_quantity"
                      name="inventory_quantity"
                      min="0"
                      value={formData.inventory_quantity}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="continue_selling"
                      name="continue_selling"
                      checked={formData.continue_selling}
                      onChange={(e) => setFormData(prev => ({ ...prev, continue_selling: e.target.checked }))}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="continue_selling" className="ml-2 block text-sm text-gray-700">
                      Continue selling when out of stock
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Shipping</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requires_shipping"
                  name="requires_shipping"
                  checked={formData.requires_shipping}
                  onChange={(e) => setFormData(prev => ({ ...prev, requires_shipping: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="requires_shipping" className="ml-2 block text-sm text-gray-700">
                  This is a physical product
                </label>
              </div>

              {formData.requires_shipping && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      name="weight"
                      step="0.01"
                      min="0"
                      value={formData.weight}
                      onChange={handleChange}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.0"
                    />
                    <select
                      name="weight_unit"
                      value={formData.weight_unit}
                      onChange={handleChange}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                      <option value="oz">oz</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Used to calculate shipping rates at checkout and label prices during fulfillment.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Sidebar - Right Side */}
        <div className="lg:col-span-1 space-y-6">

          {/* Product Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Product status</h3>
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

          {/* Product Category */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Product category</h3>
            <div>
              <label htmlFor="product_type" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="product_type"
                name="product_type"
                value={formData.product_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a category</option>
                <option value="Apparel & Accessories">Apparel & Accessories</option>
                <option value="Baby & Toddler">Baby & Toddler</option>
                <option value="Toys & Games">Toys & Games</option>
                <option value="Health & Beauty">Health & Beauty</option>
                <option value="Home & Garden">Home & Garden</option>
                <option value="Electronics">Electronics</option>
                <option value="Books & Media">Books & Media</option>
                <option value="Food & Beverage">Food & Beverage</option>
                <option value="Sports & Outdoors">Sports & Outdoors</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Collections */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Collections</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add to collections
              </label>
              {loadingCollections ? (
                <div className="text-sm text-gray-500">Loading collections...</div>
              ) : collections.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {collections.map((collection) => (
                    <div key={collection.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`collection-${collection.id}`}
                        value={collection.id}
                        checked={(formData.collections || []).includes(collection.id.toString())}
                        onChange={(e) => {
                          const collectionId = e.target.value
                          setFormData(prev => ({
                            ...prev,
                            collections: e.target.checked
                              ? [...(prev.collections || []), collectionId]
                              : (prev.collections || []).filter(id => id !== collectionId)
                          }))
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`collection-${collection.id}`} className="ml-2 block text-sm text-gray-700">
                        {collection.title}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 py-3 px-4 border border-gray-300 rounded-lg">
                  No collections found. Create collections first.
                </div>
              )}
            </div>
          </div>

          {/* Product Organization */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Product organization</h3>
            <div className="space-y-4">
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
                  placeholder="e.g., Baby Baba"
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="baby, summer, cotton"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Separate tags with commas
                </p>
              </div>
            </div>
          </div>

          {/* Search Engine Listing */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Search engine listing</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="seo_title" className="block text-sm font-medium text-gray-700 mb-2">
                  Page title
                </label>
                <input
                  type="text"
                  id="seo_title"
                  name="seo_title"
                  value={formData.seo_title}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={formData.title || "Product title"}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.seo_title.length} of 70 characters used
                </p>
              </div>

              <div>
                <label htmlFor="seo_description" className="block text-sm font-medium text-gray-700 mb-2">
                  Meta description
                </label>
                <textarea
                  id="seo_description"
                  name="seo_description"
                  rows={3}
                  value={formData.seo_description}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Description for search engines"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.seo_description.length} of 320 characters used
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Form Actions - Full Width Bottom */}
        <div className="lg:col-span-3 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between sticky bottom-0 shadow-lg">
          <Link
            href="/dashboard/products"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Discard
          </Link>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, status: 'draft' }))
                setTimeout(() => document.querySelector('form').requestSubmit(), 100)
              }}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Save as draft
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

