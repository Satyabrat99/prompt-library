# 🎯 Admin Guide: Creating Prompts with Images

## 📋 Overview
The Create Prompt page allows admins to upload images along with prompts and all necessary information. Here's how to use it effectively.

## 🚀 How to Access
1. **Login as Admin** - Use admin credentials
2. **Navigate to Admin Panel** - Click "Admin Dashboard" in sidebar
3. **Click "Create Prompt"** - Or go directly to `/admin/prompts/new`

## 📝 Step-by-Step Guide

### 1. **Basic Information**
- **Title** *(Required)*: Descriptive title for your prompt
- **Prompt Text** *(Required)*: The actual AI prompt content
- **Description** *(Optional)*: Additional context or use case explanation

### 2. **Categorization**
- **Category**: Select from existing categories or leave uncategorized
- **Media Type**: Choose Image, Video, Audio, or Text
- **Difficulty Level**: Beginner, Intermediate, or Advanced

### 3. **Image Upload** 🖼️
The page supports **3 types of images**:

#### **Primary Image** (Main Showcase)
- **Drag & Drop**: Drag image files directly onto the upload area
- **Click to Browse**: Click "Choose File" to select from computer
- **URL Input**: Enter direct image URL as alternative
- **Supported Formats**: JPG, PNG, GIF, WebP, SVG
- **Size Limit**: 10MB maximum

#### **Before Image** (Input/Reference)
- Shows the starting point or input for the prompt
- Same upload options as primary image
- Useful for "before/after" comparisons

#### **After Image** (Result/Output)
- Shows the expected result from the prompt
- Demonstrates what the prompt can achieve
- Creates compelling visual examples

### 4. **Tags System**
#### **Style Tags**
- Add visual style descriptors (e.g., "minimalist", "vintage", "futuristic")
- Press Enter or click "+" to add tags
- Click "X" on tags to remove them

#### **Industry Tags**
- Add industry-specific tags (e.g., "marketing", "education", "gaming")
- Helps users find relevant prompts for their field

### 5. **Live Preview**
- **Real-time Preview**: See how your prompt will appear to users
- **Card Format**: Shows title, description, and tags
- **Visual Feedback**: Updates as you type

### 6. **Submit & Save**
- **Create Prompt**: Saves to database and redirects to dashboard
- **Cancel**: Returns to admin dashboard without saving
- **Validation**: Required fields are validated before submission

## 🎨 Image Upload Features

### **Drag & Drop Interface**
```
┌─────────────────────────────────┐
│  🖼️  Upload Image               │
│  Click to upload or drag & drop │
│  PNG, JPG, GIF up to 10MB      │
│  [Choose File]                  │
└─────────────────────────────────┘
```

### **After Upload**
```
┌─────────────────────────────────┐
│  [Image Preview]        [❌]    │
│  ✅ Image uploaded successfully │
└─────────────────────────────────┘
```

### **Progress Indicator**
- Shows upload progress with visual bar
- Displays "Uploading..." status
- Prevents multiple uploads during process

## 🔧 Technical Details

### **Image Storage**
- **Bucket**: `prompt-images` in Supabase Storage
- **Path**: `uploads/{timestamp}-{random}.{extension}`
- **Public Access**: Images are publicly accessible
- **Cleanup**: Automatic cleanup when prompts are deleted

### **Form Validation**
- **Required Fields**: Title and Prompt Text
- **File Validation**: Type and size checking
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Toast notifications

### **Database Fields**
```sql
- title (text, required)
- prompt_text (text, required)
- description (text, optional)
- category_id (uuid, optional)
- media_type (enum: image/video/audio/text)
- difficulty_level (enum: beginner/intermediate/advanced)
- style_tags (text[], optional)
- industry_tags (text[], optional)
- image_url (text, optional)
- before_image_url (text, optional)
- after_image_url (text, optional)
- created_by (uuid, auto-filled)
```

## 💡 Best Practices

### **For Images**
- **High Quality**: Use clear, high-resolution images
- **Relevant Content**: Images should relate to the prompt
- **Consistent Style**: Maintain visual consistency across prompts
- **Appropriate Size**: Optimize for web (under 2MB recommended)

### **For Prompts**
- **Clear Instructions**: Write specific, actionable prompts
- **Include Examples**: Show what the prompt should produce
- **Use Tags Wisely**: Add relevant tags for discoverability
- **Test First**: Verify prompts work before publishing

### **For Organization**
- **Use Categories**: Group related prompts together
- **Consistent Naming**: Use descriptive, consistent titles
- **Regular Updates**: Keep prompts current and relevant

## 🚨 Troubleshooting

### **Image Upload Issues**
- **File Too Large**: Reduce image size to under 10MB
- **Invalid Format**: Use JPG, PNG, GIF, WebP, or SVG
- **Network Error**: Check internet connection and try again
- **Storage Full**: Contact admin if storage quota exceeded

### **Form Issues**
- **Required Fields**: Ensure title and prompt text are filled
- **Validation Errors**: Check all required fields are completed
- **Save Failed**: Verify internet connection and try again

## 📊 Success Metrics
After creating prompts, you can track:
- **View Count**: How many users viewed the prompt
- **Copy Count**: How many times the prompt was copied
- **User Engagement**: Through the Analytics dashboard

## 🎯 Next Steps
1. **Run SQL Setup**: Execute the provided SQL scripts for image storage
2. **Test Upload**: Try uploading a sample image
3. **Create Sample Prompt**: Add a test prompt with all fields
4. **Verify Display**: Check how it appears in the Explore page
5. **Monitor Analytics**: Track usage through the admin dashboard

---

**Ready to create amazing prompts with images!** 🎉
