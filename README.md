# موقع رياض إبراهيم (Ryden) — تعليمات التشغيل

## 1) اربط الموقع بـ Firebase
1. افتح `js/firebase-config.js`
2. احط بيانات مشروعك بدل الـ `PASTE_..._HERE` (هتلاقيها في Firebase Console → ⚙️ Project settings → Your apps → Web app)

## 2) فعّل Firestore + Authentication
- Firestore Database → Create database
- Authentication → Sign-in method → فعّل Email/Password
- Authentication → Users → ضيف يوزر بإيميلك وباسورد (ده حساب الأدمن اللي هتدخل بيه على admin.html)

## 3) حط قواعد الأمان دي في Firestore → Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /videos/{videoId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /site/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /impact/{shotId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
دي معناها: أي حد يقدر *يشوف* الفيديوهات والمحتوى (عادي، ده موقع عام)،
بس *التعديل/الإضافة* محصور بس على اللي مسجل دخول من admin.html.

## 4) احط صورتك الشخصية
استبدل `assets/images/profile.jpg` بصورتك (أو حمّلها مباشرة من داخل admin.html
بعد تسجيل الدخول — هتتحفظ تلقائي في قاعدة البيانات ومش هتحتاج ترفع ملفات يدوي تاني).

## 5) ارفع على GitHub Pages
1. اعمل repo جديد على GitHub وارفعله كل الملفات دي
2. Settings → Pages → اختار الـ branch (main) والفولدر (root) → Save
3. هياديك رابط الموقع بعد دقيقة أو اتنين

## إزاي تضيف فيديو بعد كده؟
1. افتح `yourdomain/admin.html`
2. سجل دخول بالإيميل والباسورد اللي عملتهم في الخطوة 2
3. الصق لينك يوتيوب شورتس أو جوجل درايف
   - يوتيوب: بيجيب العنوان الحقيقي بتاع الفيديو تلقائي
   - جوجل درايف: اكتب العنوان يدوي (الرابط لازم يكون "Anyone with the link can view")
4. دوس "إضافة الفيديو" — هيظهر فورًا في الموقع من غير ما تلمس أي كود

## ملاحظة عن جوجل درايف
لازم صلاحية مشاركة الفيديو تكون "Anyone with the link" وإلا مش هيشتغل الـ embed.
