# ADR-008: Progress Updates - Server-Sent Events (SSE)

## الحالة (Status)

Accepted

## السياق (Context)

عندما يقوم مستخدم منصة Ibn Al-Azhar Docs — ابن الأزهر دوكس بعملية طويلة مثل OCR (conversion) أو تصدير ملفات (export)، يحتاج لرؤية تقدم العملية في الوقت الفعلي (real-time progress updates). بدون هذه الميزة، سيشعر المستخدم بالقلق وقد يعتقد أن التطبيق متجمد أو أن العملية فشلت. نحتاج إلى آلية تدفع تحديثات من الخادم إلى العميل (server → client push) لإرسال: نسبة التقدم (0% - 100%)، حالة العملية (processing، completed، failed)، ورسائل خطأ إن وُجدت. التحديثات هي اتجاه واحد فقط (من الخادم للعميل)، ولا نحتاج للعميل أن يرسل بيانات عبر نفس القناة.

## القرار (Decision)

اخترنا Server-Sent Events (SSE) كآلية لتحديثات التقدم في الوقت الفعلي. SSE هو معيار ويب يسمح للخادم بدفع بيانات للعميل عبر اتصال HTTP طويل أحادي الاتجاه. نستخدمه لإرسال أحداث التقدم (progress events) من BullMQ workers عبر Next.js API Route إلى واجهة المستخدم.

## البدائل المعتبرة (Options Considered)

### 1. Server-Sent Events (SSE) (المختار)

- **المميزات:** أحادي الاتجاه (يناسب حالتنا: server → client فقط)، إعادة اتصال تلقائية (auto-reconnect مدمج)، مبني على HTTP عادي (لا حاجة لـ upgrade)، يعمل مع معظم proxies و load balancers، API بسيط (EventSource في المتصفح)، لا يحتاج مكتبات إضافية، يدعم event types و IDs
- **العيوب:** اتجاه واحد فقط (لا يمكن للعميل الإرسال)، لا يدعم binary data (نص فقط)، بعض حدود الاتصال في المتصفحات (6 اتصالات لكل domain في HTTP/1.1)، لا يوجد في Next.js API Routes دعم أصلي (يحتاج custom response stream)

### 2. WebSocket

- **المميزات:** اتصال ثنائي الاتجاه (bidirectional)، أداء عالي مع الرسائل المتكررة، يدعم binary data، اتصال دائم مع heartbeat
- **العيوب:** أكثر تعقيدًا من SSE (protocol upgrade، framing، heartbeat)، نحتاج لـ WebSocket server إضافي (Socket.io أو ws)، مشاكل مع بعض proxies و firewalls، إعادة الاتصال يجب إدارتها يدويًا، overkill لحالتنا (نحتاج server → client فقط)، إعداد مع Next.js معقد (لا دعم أصلي)

### 3. HTTP Polling

- **المميزات:** أبسط حل (طلب GET دوري)، يعمل في كل الظروف، لا يحتاج دعم خاص
- **العيوب:** latency عالية (تعتمد على فترة الـ polling)، استهلاك موارد غير ضروري (طلبات كثيرة حتى بدون تحديث)، لا يصلح لتحديثات فورية، overhead على الخادم مع كثرة المستخدمين

### 4. Long Polling

- **المميزات:** أقل latency من polling العادي، يعمل في كل الظروف
- **العيوب:** أكثر تعقيدًا من SSE، استهلاك اتصالات أعلى، لا يحتفظ باتصال دائم، overhead على الخادم، إدارة timeouts معقدة

## العواقب (Consequences)

- **إيجابية:** حل بسيط وأنيق لتحديثات أحادية الاتجاه، auto-reconnect مدمج يضمن استمرارية التحديثات، مبني على HTTP عادي (يتوافق مع CDNs وproxies)، لا يحتاج بنية تحتية إضافية، تجربة مستخدم سلسة مع تحديثات فورية، يمكن دمجه مع Next.js API Routes عبر ReadableStream
- **سلبية:** Next.js API Routes لا تدعم SSE بشكل أصلي (نحتاج كتابة custom stream handler)، حدود اتصال HTTP/1.1 (6 لكل domain) قد تكون مشكلة مع عمليات متعددة، لا يمكن للعميل إرسال بيانات عبر SSE (نحتاج طلب HTTP عادي لذلك)، بعض متصفحات الهاتف قد توقف SSE في الخلفية
- **مخاطر:** إذا احتجنا في المستقبل لاتصال ثنائي الاتجاه (مثل collaborative editing)، سنحتاج لإضافة WebSocket. هذا يمكن أن يتعايش مع SSE بدون تعارض.

## المتابعة (Follow-up)

- تنفيذ SSE endpoint في Next.js API Route باستخدام ReadableStream
- تصميم format للـ events (type، data، id) — يشمل أحداث Conversion و Export بشكل منفصل
- إعداد EventSource client في واجهة المستخدم مع error handling
- اختبار سلوك إعادة الاتصال عند انقطاع الشبكة
- تحديد كيفية ربط BullMQ job progress بـ SSE events (عبر Redis pub/sub)
- اختبار حدود الاتصال المتزامنة مع عمليات متعددة
- توثيق API لـ SSE endpoint
