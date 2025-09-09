# 📋 Upload Prompt Setup Guide

## 🎯 **What You Need to Do**

Follow these steps to set up the database schema for the Upload Prompt page:

---

## 📁 **SQL Files Provided**

### 1. **`UPLOAD_PROMPT_SCHEMA.sql`** - Complete Setup
- ✅ **Full database schema** with all tables, policies, and functions
- ✅ **Analytics tables** and views for advanced features
- ✅ **Comprehensive RLS policies** for security
- ✅ **Storage buckets** for images, videos, and audio
- ✅ **Sample data** and categories
- ✅ **Performance indexes** for fast queries

### 2. **`QUICK_UPLOAD_SETUP.sql`** - Minimal Setup
- ✅ **Essential tables only** (categories, user_profiles, prompts)
- ✅ **Basic RLS policies** for security
- ✅ **Image storage bucket** only
- ✅ **Sample categories** included
- ✅ **Faster setup** for quick testing

---

## 🚀 **Step-by-Step Instructions**

### **Step 1: Choose Your Setup**
- **For Production**: Use `UPLOAD_PROMPT_SCHEMA.sql`
- **For Quick Testing**: Use `QUICK_UPLOAD_SETUP.sql`

### **Step 2: Run the SQL in Supabase**
1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste** the entire SQL file content
4. **Click "Run"** to execute

### **Step 3: Promote Yourself to Admin**
After running the SQL, promote your user to admin:

```sql
SELECT public.promote_user_to_admin('your-email@example.com');
```

Replace `your-email@example.com` with your actual email address.

### **Step 4: Test the Upload Prompt Page**
1. **Login to your app** as admin
2. **Go to Admin Panel** → Upload Prompt
3. **Upload an image** and fill the form
4. **Submit** and check the explore page

---

## 📊 **What Gets Created**

### **Tables Created:**
- ✅ **`categories`** - For organizing prompts
- ✅ **`user_profiles`** - User information and roles
- ✅ **`prompts`** - Main table for uploaded prompts
- ✅ **`user_interactions`** - Analytics data (full version only)

### **Storage Buckets:**
- ✅ **`prompt-images`** - For uploaded images
- ✅ **`user-avatars`** - For user profile pictures
- ✅ **`prompt-videos`** - For video content (full version only)
- ✅ **`prompt-audio`** - For audio content (full version only)

### **Security Features:**
- ✅ **Row Level Security (RLS)** enabled on all tables
- ✅ **Public read access** for prompts and categories
- ✅ **User-specific write access** for own content
- ✅ **Admin privileges** for management functions

### **Functions Created:**
- ✅ **`handle_new_user()`** - Auto-creates user profiles
- ✅ **`promote_user_to_admin()`** - Promotes users to admin
- ✅ **`get_prompt_stats()`** - Analytics function (full version only)

---

## 🔧 **Troubleshooting**

### **If you get errors:**

1. **"Type already exists"** - This is normal, the script handles it
2. **"Policy already exists"** - This is normal, the script handles it
3. **"Bucket already exists"** - This is normal, the script handles it

### **If image upload doesn't work:**

1. **Check storage bucket** exists in Supabase Dashboard
2. **Verify RLS policies** are enabled
3. **Check browser console** for errors
4. **Ensure user is authenticated**

### **If admin access doesn't work:**

1. **Run the promote function** with your exact email
2. **Check user_profiles table** for your role
3. **Refresh the page** after promotion
4. **Clear browser cache** if needed

---

## ✅ **Verification Checklist**

After running the SQL, verify these work:

- [ ] **Categories appear** in the dropdown
- [ ] **Image upload works** in Upload Prompt page
- [ ] **Form submission succeeds** without errors
- [ ] **Uploaded prompts appear** in explore page
- [ ] **Admin navigation shows** Upload Prompt tab
- [ ] **Images display correctly** in scattered cards

---

## 🎉 **You're Ready!**

Once you've completed these steps:

1. **Your Upload Prompt page** will be fully functional
2. **Images will upload** to Supabase Storage
3. **Prompts will appear** in the explore page
4. **Admin features** will work correctly
5. **Security policies** will protect your data

**Test the complete workflow:**
1. Login as admin → Upload Prompt tab
2. Upload an image with drag & drop
3. Fill in prompt details (title, text, tags)
4. Submit the form
5. Check explore page for new card

**The Upload Prompt functionality is now ready to use!** 🚀
