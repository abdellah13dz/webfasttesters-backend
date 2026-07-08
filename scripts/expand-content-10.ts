/**
 * Expansion batch 10 (Group A stubs -> full 2,000+ word HTML articles).
 * Category + compliance cluster: webview, IoT, AR/VR, productivity, multi-language, utility, sideloading, offline-first.
 */
export const ARTICLES = [
  {
    slug: 'webview-wrapper-apps-google-play-testing-guide',
    readTime: '11 min read',
    content: `
<p>WebView wrapper apps — Android apps that mostly display a website inside a WebView — are one of the fastest ways to get a mobile presence, but they are also one of the most scrutinized app types on Google Play. Google's minimum-functionality and spam policies specifically target apps that add little value beyond a wrapped website, and wrapper apps published from a new personal account must also complete a closed test with at least 12 testers opted in for 14 continuous days before production access. This guide covers how to test and publish a WebView wrapper app so it clears both the requirement and the policies.</p>
<p>The closed-testing process is the same as for any app, but wrapper apps face a real risk of rejection for insufficient functionality, so using your testing window to confirm both quality and genuine value is essential. Done well, a wrapper app can be perfectly acceptable; done carelessly, it is a classic rejection.</p>

<h2 id="requirement">The requirement applies to wrapper apps</h2>
<p>There is no exemption for WebView wrapper apps. The closed-testing requirement is tied to your developer account type, so a wrapper app on a new personal account must complete a closed test with 12+ testers for 14 continuous days before production access. See <a href="/blog/google-play-closed-testing-guide-how-to-get-12-testers-for-14-days">the closed testing guide</a>. Given the added policy risk wrapper apps face, prepare compliance in parallel with testing.</p>
<p>Standard advice applies: recruit committed, device-diverse testers, keep your count above 12, and prepare your listing in parallel. For wrapper apps, the harder challenge is often demonstrating enough native value to satisfy policy, which we cover below.</p>

<h2 id="min-functionality">Minimum functionality and spam policy</h2>
<p>Google's policies require apps to provide a baseline of functionality and discourage apps that merely repackage a website with no added value. A thin wrapper that simply loads a site in a WebView, with no native features, offline capability, notifications, or genuine app-like experience, risks rejection under the minimum-functionality and spam policies. To be acceptable, your app should add real value beyond the mobile website — push notifications, offline support, device integrations, or a materially better experience. Review Google's <a href="https://support.google.com/googleplay/android-developer/answer/9888077">minimum functionality and spam guidance</a>.</p>
<p>Use your testing window to honestly assess whether your app clears this bar. Ask whether a user would prefer your app to just visiting the website in a browser, and if the answer is no, add native value before launch. This is the single most important consideration for a wrapper app, because no amount of testing will save an app that policy considers a low-value repackage. See <a href="/blog/app-not-eligible-for-production-access">app not eligible for production access</a>.</p>

<h2 id="what-to-test">What to test in a wrapper app</h2>
<p>Wrapper apps have distinctive failure modes. The WebView must handle navigation correctly (back button, links, external URLs), behave well offline or on poor connections, render properly across screen sizes, handle file uploads and downloads if needed, and integrate any native features cleanly. Because the app depends entirely on the WebView, issues there ruin the whole experience, so thorough testing of navigation and rendering across devices is critical.</p>
<table>
<thead>
<tr><th>Wrapper test focus</th><th>Why it matters</th></tr>
</thead>
<tbody>
<tr><td>Back button / navigation</td><td>Must behave like a native app, not a browser</td></tr>
<tr><td>Offline / poor network</td><td>Blank screens frustrate users</td></tr>
<tr><td>Rendering across sizes</td><td>Site must adapt to all screens</td></tr>
<tr><td>File upload / download</td><td>Common WebView pain point</td></tr>
<tr><td>External links</td><td>Should open appropriately, not trap users</td></tr>
</tbody>
</table>
<p>Real testers on varied devices reveal the navigation and rendering issues that make wrapper apps feel broken. See <a href="/blog/network-condition-testing-for-android-apps">network condition testing</a>.</p>

<h2 id="navigation">Testing navigation and the back button</h2>
<p>The most common complaint about wrapper apps is broken navigation. Users expect the Android back button to navigate back through the WebView history and then exit the app gracefully, not to close the app abruptly or get stuck. You must handle back-button behavior, link navigation, and the distinction between in-app content and external links that should open elsewhere. Getting this wrong makes your app feel broken even if the underlying site is perfect.</p>
<p>During your closed test, have testers navigate extensively — following links, using the back button, opening external URLs — and report anything that feels wrong. Confirm that navigating within your site stays in the app, that external links behave sensibly, and that the back button never traps or abruptly kills the app. Real testers quickly surface navigation problems you might not notice, and fixing them is what makes a wrapper feel like a genuine app rather than a clumsy browser. See <a href="/blog/deep-link-testing-before-google-play-production">deep link testing</a>.</p>

<h2 id="offline">Handling offline and poor connections</h2>
<p>A wrapper app that shows a blank white screen when connectivity drops is a poor experience and a common reason users abandon these apps. Because your content lives on the web, you must handle offline and slow-network states gracefully — showing a helpful message, cached content, or a retry option rather than a blank or broken page. Adding genuine offline support also helps satisfy the minimum-functionality bar by providing value beyond the website.</p>
<p>Test how your app behaves on slow, intermittent, and absent connections, since real users frequently encounter all three. Confirm it degrades gracefully and recovers when connectivity returns. This is both a quality issue and, to a degree, a policy one, since thoughtful offline handling is exactly the kind of native value that distinguishes an acceptable wrapper from a rejected one. Real testers on varied networks are the reliable way to validate this behavior. See <a href="/blog/offline-first-apps-and-closed-testing-best-practices">offline-first best practices</a>.</p>

<h2 id="track-setup">Setting up your closed-testing track</h2>
<p>Once your signed release build is ready, create a closed-testing track in the Play Console and upload it, add testers by email or Google Group, and share the opt-in link each tester must use before installing. Correct configuration matters because the 14-day clock counts only opted-in testers, and a misconfigured track is a common reason developers realize late that their timer never started. Install from the listing on a real device and confirm the WebView loads and navigation works before inviting your full group. See <a href="/blog/how-to-create-a-closed-testing-track-in-play-console">how to create a closed testing track</a>.</p>
<p>Give testers clear onboarding instructions covering the opt-in flow and what to exercise — navigation, offline behavior, and any native features. Every failed opt-in is a tester who does not count toward your 12, so smooth guidance maximizes active testers from day one and gives you the device-diverse coverage a WebView-dependent app needs.</p>

<h2 id="recruiting">Recruiting and managing the window</h2>
<p>You need 12+ committed, device-diverse testers for 14 continuous days. Recruit a buffer above 12 to absorb attrition, keep testers engaged with clear tasks and quick responses, and direct them to test navigation, offline states, and rendering across devices. Monitor your active count in the Play Console and recruit replacements early if it slips toward the minimum. Actively managing the window is the biggest factor in clearing it on the first attempt.</p>
<p>If assembling a reliable, device-diverse group is your bottleneck, a service that supplies verified real testers solves it quickly. You can <a href="https://app.fasttesters.com/">submit your app</a> to get started, and read <a href="/blog/where-to-find-real-android-app-testers">where to find real testers</a> and <a href="/blog/how-to-keep-testers-engaged-during-closed-testing">how to keep testers engaged</a>.</p>

<h2 id="real-device">Why real-device testing matters for wrapper apps</h2>
<p>WebView behavior varies across devices and Android versions more than developers expect, because the system WebView component is updated independently and rendering can differ. A site that renders and navigates perfectly on your development phone can misbehave on another device with a different WebView version or screen size. File pickers, downloads, and permission prompts triggered from within the WebView are especially prone to device-specific quirks. Only real testers on varied devices reveal these problems before your users hit them.</p>
<p>This is why the closed-testing requirement, built on real opt-in testers, is genuinely useful even for a seemingly simple wrapper app. Real testers navigating your app across diverse devices surface the rendering, navigation, and integration issues that make wrapper apps feel broken. The window is your structured chance to confirm the experience holds up across the market, and device diversity in your tester group is what makes that confidence real.</p>

<h2 id="rejection">Common reasons wrapper apps get rejected</h2>
<p>Wrapper apps hit a predictable set of rejection causes. The leading one is insufficient functionality — an app judged to add nothing beyond the website. Broken navigation discovered during review, poor offline handling, misleading store listings that overstate the app, and permissions requested without justification also cause rejections. Because wrapper apps are a known low-effort pattern, they receive extra scrutiny, so the bar for demonstrating genuine value is higher than for other app types.</p>
<p>Use your window to audit against these pitfalls: confirm your app adds real native value, verify navigation and offline behavior work, ensure your listing accurately represents the app, and justify every permission. Catching these before you request production access is what prevents the classic wrapper-app rejection and the frustrating cycle of resubmission. See <a href="/blog/app-not-eligible-for-production-access">app not eligible for production access</a>.</p>

<h2 id="to-production">From closed testing to production</h2>
<p>When your 14 continuous days with 12+ testers complete, request production access in the Play Console. For a wrapper app, be especially sure your app clears the minimum-functionality bar and that navigation, offline handling, and your listing are all solid before you submit, since these are the most likely rejection points. Preparing everything in parallel during the window lets you submit immediately rather than losing more time. See <a href="/blog/what-happens-after-14-days-of-closed-testing">what happens after 14 days</a>.</p>

<h2 id="quality">Making the 14-day window count</h2>
<p>Because the requirement forces you to test anyway, the smart move is to extract genuine value from the window rather than treating it as a formality. For a wrapper app, that means using the time to confirm your app clears the functionality bar, that navigation and offline handling are solid, and that the experience genuinely justifies being an app rather than a bookmark. Brief your testers clearly, give them specific things to try, and treat their feedback as a chance to strengthen a category of app that is otherwise prone to rejection.</p>
<p>A well-run window turns a mandatory delay into a materially better product and a smoother review. Enter production having resolved the navigation, rendering, and value concerns your testers surfaced, and you avoid the frustrating resubmission cycle that thin wrapper apps so often suffer. The 14 days are an investment; spending them deliberately is what separates a confident launch from a hopeful one. See <a href="/blog/app-testing-checklist-before-release">the testing checklist</a>.</p>

<h2 id="feedback">Turning tester feedback into fixes</h2>
<p>The value of your closed test scales with how well you capture and act on feedback. Give testers a frictionless way to report problems and ask specific questions: did the back button behave, did any page fail to load, did the app feel like a real app or just a website, did anything look broken on your device? Concrete questions produce the actionable reports that let you fix the navigation, rendering, and value issues most likely to cause rejection or poor reviews for a wrapper app.</p>
<p>Then close the loop: when you ship a build addressing reported issues, tell testers what changed and ask them to reconfirm on their device. This validates fixes across diverse hardware and WebView versions and keeps testers engaged. A wrapper app that enters production having already resolved its navigation and offline problems launches far stronger than one that treated the window as a formality. See <a href="/blog/crash-reports-during-closed-testing-fix-before-production">fixing crashes before production</a>.</p>

<h2 id="timeline">A realistic timeline for your launch</h2>
<p>Plan backward from the 14-day minimum. Expect a few days up front to finalize your build, recruit and onboard device-diverse testers, and confirm opt-ins before your continuous window truly begins. The 14 days then run while you fix issues and ship updates, and production review after you request access takes additional days. Budgeting three to four weeks end to end, rather than exactly 14, keeps your wrapper app's launch aligned with reality.</p>
<p>Developers who hit their dates front-load recruitment and, for wrapper apps, the work of demonstrating genuine value so nothing blocks them when the window closes. If tester recruitment is your uncertain variable, resolving it early through your network or a service supplying verified real testers is the highest-leverage step for keeping your launch on schedule. See <a href="/blog/how-to-get-12-testers-without-friends-or-family">getting 12 testers without friends or family</a>.</p>

<h2 id="internal">Use internal testing before your closed test</h2>
<p>The Play Console's internal testing track is faster than the closed track and ideal for a first pass. For a wrapper app, use it to shake out obvious navigation and loading problems with a small trusted group before your counted 14-day window begins. Catching a broken WebView or a trapping back button privately, rather than during your closed test, protects your testers' goodwill and prevents losing days of your continuous window to a build with basic issues.</p>
<p>A practical rhythm is to validate each release candidate on the internal track, confirm navigation and offline behavior on a couple of real devices, then promote it to the closed track where your counted testers live. This staging discipline keeps the closed track stable and your feedback focused on real quality rather than obvious bugs. Treating internal testing as staging and closed testing as the requirement keeps your window productive. See <a href="/blog/google-play-internal-testing-vs-closed-testing">internal vs closed testing</a>.</p>

<h2 id="takeaways">Key takeaways</h2>
<ul>
<li><strong>Wrapper apps must meet the 12-tester, 14-day requirement</strong> like any app.</li>
<li><strong>Clear the minimum-functionality bar</strong> — add real value beyond the website.</li>
<li><strong>Test navigation and the back button</strong> to feel native, not browser-like.</li>
<li><strong>Handle offline and poor networks gracefully</strong>, not with blank screens.</li>
<li><strong>Test WebView behavior across diverse devices</strong> and versions.</li>
</ul>

<h2 id="faq">Frequently asked questions</h2>
<h3>Are WebView wrapper apps allowed on Google Play?</h3>
<p>Yes, if they provide genuine value beyond the website. Thin wrappers that merely repackage a site risk rejection under minimum-functionality and spam policies.</p>
<h3>Do wrapper apps need closed testing?</h3>
<p>Yes. On a new personal account, the 12-tester, 14-day requirement applies to wrapper apps.</p>
<h3>How do I make my wrapper app acceptable?</h3>
<p>Add native value — push notifications, offline support, device integrations, or a materially better experience than the mobile website.</p>
<h3>What's the most common wrapper-app bug?</h3>
<p>Broken back-button and navigation behavior. Users expect native navigation, not browser-like or trapping behavior.</p>
<h3>Why test WebView apps on many devices?</h3>
<p>The system WebView updates independently and rendering varies, so behavior differs across devices and versions.</p>
`,
  },
  {
    slug: 'testing-iot-companion-android-apps',
    readTime: '11 min read',
    content: `
<p>IoT companion apps — the Android apps that pair with smart-home devices, wearables, fitness equipment, or other connected hardware — bring a distinctive testing challenge: the app is only half of the product, and the other half is physical hardware with its own connectivity and behavior. Before an IoT companion app published from a new personal account can reach production, it must complete a closed test with at least 12 testers opted in for 14 continuous days. This guide covers how to test IoT companion apps effectively and satisfy the requirement despite the added complexity of hardware dependencies.</p>
<p>The closed-testing process is the same as for any app, but IoT apps depend on device pairing, connectivity (often Bluetooth or Wi-Fi), and real-world hardware behavior that are hard to simulate. Making the most of your window means testing the full app-plus-hardware experience across the messy conditions users will actually encounter.</p>

<h2 id="requirement">The requirement applies to IoT companion apps</h2>
<p>There is no exemption for IoT companion apps. The closed-testing requirement is tied to your developer account type, so an IoT companion app on a new personal account must complete a closed test with 12+ testers for 14 continuous days before production access. See <a href="/blog/google-play-closed-testing-guide-how-to-get-12-testers-for-14-days">the closed testing guide</a>. The wrinkle is that meaningful testing benefits from testers who can actually connect to your hardware.</p>
<p>Standard advice applies: recruit committed, device-diverse testers, keep your count above 12, and prepare your listing in parallel. For IoT apps, connectivity and pairing reliability across devices are the areas that most need real-world validation.</p>

<h2 id="pairing">Testing pairing and connectivity</h2>
<p>The defining challenge of an IoT companion app is the connection to hardware. Pairing flows — discovering the device, connecting, authenticating — must work reliably across the many Android devices and versions your users have, and connectivity via Bluetooth or Wi-Fi must be robust in the face of interference, range limits, and dropouts. Because Bluetooth stacks and permission behavior vary significantly across manufacturers, pairing that works on your development phone can fail on another, making device-diverse testing essential.</p>
<table>
<thead>
<tr><th>IoT test focus</th><th>Why it matters</th></tr>
</thead>
<tbody>
<tr><td>Pairing / discovery</td><td>First experience; varies by device</td></tr>
<tr><td>Bluetooth / Wi-Fi stability</td><td>Dropouts break the product</td></tr>
<tr><td>Reconnection</td><td>Must recover after range/power loss</td></tr>
<tr><td>Permissions</td><td>BLE/location permissions vary by version</td></tr>
<tr><td>Firmware updates</td><td>OTA flows must be reliable and safe</td></tr>
</tbody>
</table>
<p>Real testers connecting real hardware across devices reveal the pairing and connectivity issues that define IoT apps. See <a href="https://developer.android.com/develop/connectivity/bluetooth">Android Bluetooth documentation</a>.</p>

<h2 id="permissions">Bluetooth and location permissions</h2>
<p>IoT apps that use Bluetooth face a permission landscape that has changed across Android versions, including the relationship between Bluetooth scanning and location permissions and the newer dedicated Bluetooth permissions. You must request the correct permissions for the Android versions you support, explain why you need them, and handle denial gracefully. Getting this wrong causes pairing to silently fail on some devices, which is a common and confusing IoT bug. Test permission flows across the range of Android versions your users have.</p>
<p>During your closed test, ensure testers on different Android versions exercise the pairing flow, and watch for permission-related failures. Because the permission model differs by version, an app that pairs fine on your device may fail on an older or newer one due to a permission your code did not request correctly. Real-device, multi-version testing is the only reliable way to catch these, and it directly protects the first-run experience that determines whether users keep your app. See <a href="/blog/notification-permission-changes-and-app-testing">permission changes and testing</a>.</p>

<h2 id="hardware-behavior">Testing real hardware behavior</h2>
<p>Beyond pairing, IoT apps must handle the realities of physical hardware: devices that go out of range, lose power, or behave unexpectedly, and the need to reconnect gracefully when they return. Test what happens when the hardware disconnects mid-operation, when it is powered off and on, and when the phone moves out of and back into range. The app should recover cleanly, show sensible status, and never leave the user confused about whether the device is connected.</p>
<p>If your product supports firmware or over-the-air updates through the app, test these carefully, since a failed firmware update can brick hardware and is among the most damaging failures an IoT product can have. Confirm update flows are reliable, resumable, and safe across devices and connection conditions. Real testers using real hardware in real environments surface the connectivity and update edge cases that no lab simulation can, which is why the closed-testing window is genuinely valuable for IoT apps.</p>

<h2 id="track-setup">Setting up your closed-testing track</h2>
<p>Once your signed release build is ready, create a closed-testing track in the Play Console and upload it, add testers by email or Google Group, and share the opt-in link each tester must use before installing. Correct configuration matters because the 14-day clock counts only opted-in testers, and a misconfigured track is a common reason developers realize late that their timer never started. Where possible, ensure some testers have access to your hardware; where they do not, be clear about what portion of the app they can still evaluate. See <a href="/blog/how-to-create-a-closed-testing-track-in-play-console">how to create a closed testing track</a>.</p>
<p>Give testers clear onboarding instructions covering the opt-in flow, any pairing steps, and what to test. Every failed opt-in is a tester who does not count toward your 12, so smooth guidance maximizes active testers from day one and gives you the device-diverse connectivity coverage an IoT app critically needs.</p>

<h2 id="recruiting">Recruiting and managing the window</h2>
<p>You need 12+ committed, device-diverse testers for 14 continuous days, and for IoT apps it helps enormously if some testers can connect to your actual hardware. This makes recruitment more nuanced than for a typical app: you want a mix of testers who satisfy the requirement and, ideally, some who can exercise the full hardware experience. Recruit a buffer above 12 and keep testers engaged with clear tasks and quick responses.</p>
<p>If assembling a reliable, device-diverse group is your bottleneck, a service that supplies verified real testers solves the requirement quickly, and you can supplement with hardware-equipped contacts from your own network. You can <a href="https://app.fasttesters.com/">submit your app</a> to get started, and read <a href="/blog/where-to-find-real-android-app-testers">where to find real testers</a>.</p>

<h2 id="real-device">Why real-device testing matters for IoT apps</h2>
<p>No app type depends on real-device, real-world testing more than an IoT companion, because the variables that break these apps — Bluetooth stack differences, permission-model changes, radio interference, hardware quirks — simply cannot be reproduced in an emulator or a clean lab. Bluetooth behavior in particular varies dramatically across manufacturers, and pairing reliability is the make-or-break first experience for an IoT product. Testing on one device tells you almost nothing about how pairing will fare across the market.</p>
<p>This is exactly why the closed-testing requirement, built on real opt-in testers, is valuable for IoT apps. Real testers connecting real hardware across diverse devices and environments surface the pairing failures, dropouts, and permission bugs that define the IoT experience. The window is your structured chance to validate the full app-plus-hardware product under realistic conditions, and device diversity in your tester group is the most important factor in that validation.</p>

<h2 id="rejection">Common reasons IoT apps get rejected or fail</h2>
<p>IoT companion apps hit both policy and quality pitfalls. On policy, permissions — especially location tied to Bluetooth scanning — must be justified, and inaccurate data declarations cause problems. On quality, the most damaging failures are pairing that does not work across devices, unreliable connectivity, and poor handling of disconnects, all of which generate harsh reviews even if they do not block launch. Because an IoT app's value is inseparable from its hardware connection, connectivity failures are effectively product failures.</p>
<p>Use your window to audit against these pitfalls: justify and correctly implement all permissions, verify pairing and reconnection across devices and Android versions, and ensure your declarations match behavior. Catching these before launch protects both your review outcome and your early reviews. See <a href="/blog/app-not-eligible-for-production-access">app not eligible for production access</a>.</p>

<h2 id="to-production">From closed testing to production</h2>
<p>When your 14 continuous days with 12+ testers complete, request production access in the Play Console. For an IoT app, confirm pairing, connectivity, permissions, and any update flows are reliable across devices, and your declarations are accurate, before you submit. Preparing your listing in parallel during the window lets you submit immediately rather than losing more time. See <a href="/blog/what-happens-after-14-days-of-closed-testing">what happens after 14 days</a>.</p>

<h2 id="quality">Making the 14-day window count</h2>
<p>Because the requirement forces you to test anyway, extract genuine value from the window rather than treating it as a formality. For an IoT companion app, that means using the time to prove pairing and connectivity work across devices, that reconnection is graceful, and that any firmware flows are safe. Brief your testers clearly, especially those with access to your hardware, give them specific pairing and connectivity scenarios to try, and treat their reports as a chance to harden the app-plus-hardware experience that defines your product.</p>
<p>A well-run window turns a mandatory delay into a materially more reliable product. Enter production having resolved the pairing failures, dropouts, and permission bugs your testers surfaced, and you avoid the harsh early reviews that connectivity problems generate for IoT apps. The 14 days are an investment in the connection reliability your product lives on. See <a href="/blog/app-testing-checklist-before-release">the testing checklist</a>.</p>

<h2 id="feedback">Turning tester feedback into fixes</h2>
<p>The value of your closed test scales with how well you capture and act on feedback. Give testers a frictionless way to report problems and ask specific questions: did pairing succeed on the first try, did the connection stay stable, did it reconnect after going out of range, did any permission prompt block you? Concrete questions produce the actionable reports that let you fix the connectivity and pairing issues most likely to hurt an IoT app.</p>
<p>Then close the loop: when you ship a build addressing reported issues, tell testers what changed and ask them to reconfirm with their hardware and device. This validates fixes across diverse Bluetooth stacks and Android versions and keeps testers engaged. An IoT app that enters production having already resolved its pairing and connectivity problems launches with the reliability its hardware-dependent experience demands. See <a href="/blog/crash-reports-during-closed-testing-fix-before-production">fixing crashes before production</a>.</p>

<h2 id="timeline">A realistic timeline for your launch</h2>
<p>Plan backward from the 14-day minimum. Expect several days up front to finalize your build, arrange hardware access for testers where possible, recruit and onboard testers, and confirm opt-ins before your continuous window truly begins. The 14 days then run while you fix issues, and production review takes additional days. Budgeting three to four weeks end to end, rather than exactly 14, keeps your IoT launch aligned with reality.</p>
<p>Developers who hit their dates front-load recruitment — including arranging hardware-equipped testers — so nothing blocks them when the window closes. If tester recruitment is your uncertain variable, resolving it early through your network or a service supplying verified real testers is the highest-leverage step for keeping your launch on schedule. See <a href="/blog/how-to-get-12-testers-without-friends-or-family">getting 12 testers without friends or family</a>.</p>

<h2 id="internal">Use internal testing before your closed test</h2>
<p>The Play Console's internal testing track is faster than the closed track and ideal for a first pass. For an IoT app, use it to shake out obvious pairing and permission problems with a small trusted group who have your hardware before your counted 14-day window begins. Catching a broken pairing flow privately, rather than during your closed test, protects your testers' goodwill and prevents losing days of your continuous window to a build that cannot connect.</p>
<p>A practical rhythm is to validate each release candidate on the internal track, confirm pairing and connectivity on a couple of real devices and Android versions, then promote it to the closed track where your counted testers live. This staging discipline keeps the closed track stable and your feedback focused on real reliability. Treating internal testing as staging and closed testing as the requirement keeps your window productive. See <a href="/blog/google-play-internal-testing-vs-closed-testing">internal vs closed testing</a>.</p>

<h2 id="takeaways">Key takeaways</h2>
<ul>
<li><strong>IoT companion apps must meet the 12-tester, 14-day requirement</strong> like any app.</li>
<li><strong>Test pairing and connectivity</strong> across diverse devices and Android versions.</li>
<li><strong>Get Bluetooth and location permissions right</strong> for every supported version.</li>
<li><strong>Test real hardware behavior</strong> — disconnects, reconnection, firmware updates.</li>
<li><strong>Prioritize testers who can access your hardware</strong> where possible.</li>
</ul>

<h2 id="faq">Frequently asked questions</h2>
<h3>Do IoT companion apps need closed testing?</h3>
<p>Yes. On a new personal account, the 12-tester, 14-day requirement applies to IoT companion apps.</p>
<h3>What's the hardest part of testing an IoT app?</h3>
<p>Pairing and connectivity across diverse devices, since Bluetooth stacks and permission behavior vary widely by manufacturer and version.</p>
<h3>Why do Bluetooth apps need location permission?</h3>
<p>On some Android versions, Bluetooth scanning required location permission. The model has changed, so request the correct permissions per version.</p>
<h3>Do testers need my hardware?</h3>
<p>Ideally some do, to test the full experience. Others can still validate the app portions and satisfy the requirement.</p>
<h3>How do I test firmware updates?</h3>
<p>Carefully and across conditions, since a failed update can brick hardware. Ensure update flows are reliable, resumable, and safe.</p>
`,
  },
  {
    slug: 'ar-vr-android-apps-and-closed-testing-requirements',
    readTime: '11 min read',
    content: `
<p>Augmented and virtual reality apps push Android hardware harder than almost any other category, relying on cameras, motion sensors, real-time rendering, and demanding performance to create immersive experiences. Before an AR or VR app published from a new personal account can reach production, it must complete a closed test with at least 12 testers opted in for 14 continuous days — and AR/VR apps benefit enormously from device-diverse, real-world testing given how hardware-dependent they are. This guide covers closed testing for AR/VR apps and the category-specific issues to prioritize during your window.</p>
<p>The closed-testing process is the same as for any app, but AR/VR apps stress performance, sensors, and the physical environment in ways ordinary apps do not. Using your testing window to validate the experience across varied devices and real spaces is what turns the mandatory wait into genuine preparation for a demanding category.</p>

<h2 id="requirement">The requirement applies to AR/VR apps</h2>
<p>There is no exemption for AR/VR apps. The closed-testing requirement is tied to your developer account type, so an AR/VR app on a new personal account must complete a closed test with 12+ testers for 14 continuous days before production access. See <a href="/blog/google-play-closed-testing-guide-how-to-get-12-testers-for-14-days">the closed testing guide</a>. Given how much AR/VR relies on hardware capabilities, device diversity is especially important.</p>
<p>Standard advice applies: recruit committed, device-diverse testers, keep your count above 12, and prepare your listing in parallel. AR/VR apps additionally need testing across real environments and a range of device capabilities.</p>

<h2 id="capabilities">Device capabilities and compatibility</h2>
<p>AR and VR features depend on specific hardware capabilities — motion sensors, camera quality, processing power, and in the case of AR, support for frameworks like ARCore. Not every device supports these equally, and some do not support them at all. You must correctly declare your hardware requirements so your app only appears to compatible devices, and you must test that your app detects capabilities and degrades gracefully when something is missing. An AR app that crashes or misbehaves on an unsupported device generates poor reviews and review friction. See Google's <a href="https://developers.google.com/ar">ARCore documentation</a>.</p>
<table>
<thead>
<tr><th>AR/VR test focus</th><th>Why it matters</th></tr>
</thead>
<tbody>
<tr><td>Capability detection</td><td>Graceful behavior on limited devices</td></tr>
<tr><td>ARCore / framework support</td><td>Availability varies by device</td></tr>
<tr><td>Sensor accuracy</td><td>Tracking quality varies by hardware</td></tr>
<tr><td>Performance / thermals</td><td>Demanding rendering; devices overheat</td></tr>
<tr><td>Camera / environment</td><td>Lighting and space affect AR</td></tr>
</tbody>
</table>
<p>Device-diverse testing reveals compatibility and performance issues you cannot see on one device. See <a href="/blog/low-end-device-testing-for-global-play-store-launch">low-end device testing</a>.</p>

<h2 id="performance">Performance and thermal testing</h2>
<p>AR/VR is among the most performance-intensive things a phone can do, combining camera processing, sensor fusion, and real-time 3D rendering. This taxes the CPU, GPU, and battery heavily, and devices can overheat and throttle during sustained use, degrading the experience. Test frame rate, tracking stability, battery drain, and thermal behavior during realistic sessions, especially on mid-range devices where performance headroom is limited. An AR/VR experience that stutters or overheats quickly loses users.</p>
<p>Because performance varies so much across hardware, device-diverse testing is essential: an experience that runs beautifully on a flagship may be unusable on a mid-range phone. During your closed test, have testers use the app in realistic sessions and report stutter, tracking loss, overheating, and battery drain. The Play Console's Android vitals will surface stability data. Validating performance and thermals across devices is what ensures your AR/VR app is enjoyable rather than frustrating for the range of users you target. See <a href="/blog/performance-testing-guide-for-android-apps">performance testing</a>.</p>

<h2 id="environment">Testing across real environments</h2>
<p>AR apps in particular depend on the physical environment: lighting, available space, surfaces, and movement all affect tracking and the experience. An AR app tested only in your well-lit office may behave very differently in a dim room, a cluttered space, or outdoors. VR apps depend on the user having safe space to move and on comfortable, motion-sickness-aware design. These are things you can only validate by having real testers use the app in their own varied environments.</p>
<p>During your window, encourage testers to use the app in different settings and report where tracking degrades or the experience breaks down. For VR, gather feedback on comfort and motion sickness, which are critical to retention and vary by person. Real-world, real-environment testing is exactly what the closed-testing window provides, and for AR/VR it surfaces the environmental and comfort issues that lab testing never would. See <a href="/blog/camera-and-microphone-apps-testing-checklist">camera-permission testing</a>.</p>

<h2 id="track-setup">Setting up your closed-testing track</h2>
<p>Once your signed release build is ready, create a closed-testing track in the Play Console and upload it, add testers by email or Google Group, and share the opt-in link each tester must use before installing. Correct configuration matters because the 14-day clock counts only opted-in testers, and a misconfigured track is a common reason developers realize late that their timer never started. Confirm your device-compatibility declarations are correct so the app reaches only capable devices, and install on a real device to verify before inviting your group. See <a href="/blog/how-to-create-a-closed-testing-track-in-play-console">how to create a closed testing track</a>.</p>
<p>Give testers clear onboarding instructions covering the opt-in flow and what to test — different environments, sustained sessions, and comfort. Every failed opt-in is a tester who does not count toward your 12, so smooth guidance maximizes active testers from day one and gives you the device- and environment-diverse coverage AR/VR needs.</p>

<h2 id="recruiting">Recruiting and managing the window</h2>
<p>You need 12+ committed, device-diverse testers for 14 continuous days, and for AR/VR, capable and varied devices plus varied real environments matter greatly. Recruit a buffer above 12, keep testers engaged with clear tasks and quick responses, and direct them to test in different settings and report performance and comfort. Monitor your active count in the Play Console and recruit replacements early if it slips.</p>
<p>If assembling a device-diverse group is your bottleneck, a service that supplies verified real testers on varied hardware solves it quickly. You can <a href="https://app.fasttesters.com/">submit your app</a> to get started, and read <a href="/blog/where-to-find-real-android-app-testers">where to find real testers</a> and <a href="/blog/how-to-keep-testers-engaged-during-closed-testing">how to keep testers engaged</a>.</p>

<h2 id="rejection">Common reasons AR/VR apps struggle</h2>
<p>AR/VR apps hit both policy and quality pitfalls. On policy, camera and sensor permissions must be justified, and incorrect device-compatibility declarations can surface the app to unsupported devices where it fails. On quality, the most damaging issues are poor performance on mid-range devices, tracking that breaks in real environments, and motion sickness or discomfort in VR — all of which generate harsh reviews. Because the experience is so hardware- and environment-dependent, these problems are easy to miss without diverse real-world testing.</p>
<p>Use your window to audit against these pitfalls: justify permissions, verify compatibility declarations, validate performance and thermals across devices, and gather comfort feedback for VR. Catching these before launch protects both review and early reviews. See <a href="/blog/app-not-eligible-for-production-access">app not eligible for production access</a>.</p>

<h2 id="to-production">From closed testing to production</h2>
<p>When your 14 continuous days with 12+ testers complete, request production access in the Play Console. For an AR/VR app, confirm compatibility declarations, permissions, performance across devices, and comfort are all solid before you submit. Preparing your listing in parallel during the window lets you submit immediately rather than losing more time. See <a href="/blog/what-happens-after-14-days-of-closed-testing">what happens after 14 days</a>.</p>

<h2 id="quality">Making the 14-day window count</h2>
<p>Because the requirement forces you to test anyway, extract genuine value from the window rather than treating it as a formality. For an AR/VR app, that means proving performance and tracking hold up across devices and real environments, and that the experience is comfortable. Brief your testers clearly, ask them to use the app in different settings and for sustained sessions, and treat their reports as a chance to harden a demanding experience before it reaches the public.</p>
<p>A well-run window turns a mandatory delay into a materially better product. Enter production having resolved the performance cliffs, tracking failures, and comfort issues your testers surfaced, and you avoid the harsh reviews that AR/VR apps attract when they stutter, overheat, or cause discomfort. The 14 days are an investment in an experience that is hardware- and environment-sensitive by nature. See <a href="/blog/app-testing-checklist-before-release">the testing checklist</a>.</p>

<h2 id="feedback">Turning tester feedback into fixes</h2>
<p>The value of your closed test scales with how well you capture and act on feedback. Give testers a frictionless way to report problems and ask specific questions: did the app run smoothly, did tracking hold in your environment, did the device overheat, did anything feel uncomfortable or nauseating? Concrete questions produce the actionable reports that let you fix the performance, tracking, and comfort issues most likely to hurt an AR/VR app.</p>
<p>Then close the loop: when you ship a build addressing reported issues, tell testers what changed and ask them to reconfirm on their device and in their space. This validates fixes across diverse hardware and environments and keeps testers engaged. An AR/VR app that enters production having already resolved its performance and comfort problems launches ready to impress rather than frustrate. See <a href="/blog/crash-reports-during-closed-testing-fix-before-production">fixing crashes before production</a>.</p>

<h2 id="timeline">A realistic timeline for your launch</h2>
<p>Plan backward from the 14-day minimum. Expect several days up front to finalize your build, recruit and onboard device-diverse testers, and confirm opt-ins before your continuous window truly begins. The 14 days then run while you fix issues and ship updates, and production review takes additional days. Budgeting three to four weeks end to end, rather than exactly 14, keeps your AR/VR launch aligned with reality, especially since performance fixes across devices often need iteration.</p>
<p>Developers who hit their dates front-load recruitment. Because AR/VR depends so heavily on device diversity and varied environments, and that coverage is hard to assemble alone, resolving your tester source early through your network or a service supplying verified real testers on varied hardware is the highest-leverage step for keeping your launch on schedule. See <a href="/blog/how-to-get-12-testers-without-friends-or-family">getting 12 testers without friends or family</a>.</p>

<h2 id="internal">Use internal testing before your closed test</h2>
<p>The Play Console's internal testing track is faster than the closed track and ideal for a first pass. For an AR/VR app, use it to shake out obvious crashes, capability-detection problems, and performance issues with a small trusted group before your counted 14-day window begins. Catching a crash on an unsupported device privately, rather than during your closed test, protects your testers' goodwill and prevents losing days of your continuous window to a build with basic problems.</p>
<p>A practical rhythm is to validate each release candidate on the internal track, confirm performance and tracking on a couple of real devices, then promote it to the closed track where your counted testers live. This staging discipline keeps the closed track stable and your feedback focused on real quality. Treating internal testing as staging and closed testing as the requirement keeps your window productive. See <a href="/blog/google-play-internal-testing-vs-closed-testing">internal vs closed testing</a>.</p>

<h2 id="post-launch">After launch: monitoring performance</h2>
<p>Your closed test is the start of quality assurance, not the end. After launch, keep watching Android vitals for crashes and ANRs, and pay attention to reviews, which for AR/VR apps often center on performance, overheating, and comfort. New devices constantly appear with different capabilities, so treat monitoring as ongoing and address emerging issues with updates. An AR/VR app that stays responsive across the evolving device landscape keeps its audience; one that degrades loses it. See <a href="/blog/battery-usage-testing-and-play-store-vitals">battery usage testing and vitals</a>.</p>

<h2 id="takeaways">Key takeaways</h2>
<ul>
<li><strong>AR/VR apps must meet the 12-tester, 14-day requirement</strong> like any app.</li>
<li><strong>Declare device capabilities correctly</strong> and degrade gracefully on limited hardware.</li>
<li><strong>Test performance and thermals</strong> across devices, especially mid-range.</li>
<li><strong>Test in varied real environments</strong> — lighting, space, movement.</li>
<li><strong>Gather comfort/motion-sickness feedback</strong> for VR.</li>
</ul>

<h2 id="faq">Frequently asked questions</h2>
<h3>Do AR/VR apps need closed testing?</h3>
<p>Yes. On a new personal account, the 12-tester, 14-day requirement applies to AR/VR apps.</p>
<h3>Why is device diversity so important for AR/VR?</h3>
<p>These apps depend on sensors, cameras, and performance that vary widely, so only varied real hardware reveals the true experience.</p>
<h3>How do I handle unsupported devices?</h3>
<p>Declare your hardware requirements so the app reaches only capable devices, and detect capabilities to degrade gracefully.</p>
<h3>What should I test for VR specifically?</h3>
<p>Comfort and motion sickness, safe movement space, and performance during sustained sessions, gathering real user feedback.</p>
<h3>Why test AR in different environments?</h3>
<p>Lighting, space, and surfaces affect tracking. An app that works in your office may fail in dim or cluttered real spaces.</p>
`,
  },
  {
    slug: 'productivity-apps-meeting-google-play-testing-rules',
    readTime: '11 min read',
    content: `
<p>Productivity apps — task managers, note-takers, calendars, document tools, and the like — are a crowded, competitive category where reliability and polish make the difference. Before a productivity app published from a new personal account can reach production, it must complete a closed test with at least 12 testers opted in for 14 continuous days. This guide covers how to meet the testing rules for a productivity app and the category-specific issues to prioritize during your window, so you launch something users trust with their work.</p>
<p>The closed-testing process is the same as for any app, but productivity apps carry particular expectations around data reliability, syncing, and cross-device consistency, because users depend on them for important information. Using your testing window to validate these thoroughly turns the mandatory wait into real assurance for an app people will rely on daily.</p>

<h2 id="requirement">The requirement applies to productivity apps</h2>
<p>There is no exemption for productivity apps. The closed-testing requirement is tied to your developer account type, so a productivity app on a new personal account must complete a closed test with 12+ testers for 14 continuous days before production access. See <a href="/blog/google-play-closed-testing-guide-how-to-get-12-testers-for-14-days">the closed testing guide</a>. Plan the window into your launch schedule.</p>
<p>Standard advice applies: recruit committed, device-diverse testers, keep your count above 12, and prepare your listing in parallel. For productivity apps, data integrity and sync reliability are the areas that most need validation.</p>

<h2 id="data-integrity">Data integrity and reliability</h2>
<p>Users trust productivity apps with their notes, tasks, and documents, so data integrity is paramount. A productivity app that loses data, corrupts content, or fails to save reliably destroys trust instantly and earns brutal reviews. Test creating, editing, saving, and deleting content extensively, including edge cases like large documents, rapid edits, and interruptions such as the app being backgrounded or the device running low on memory. Data must never be silently lost.</p>
<table>
<thead>
<tr><th>Productivity test focus</th><th>Why it matters</th></tr>
</thead>
<tbody>
<tr><td>Save / autosave</td><td>Data loss is unforgivable</td></tr>
<tr><td>Sync across devices</td><td>Consistency is a core expectation</td></tr>
<tr><td>Conflict handling</td><td>Concurrent edits must resolve sensibly</td></tr>
<tr><td>Offline editing</td><td>Work must continue without connectivity</td></tr>
<tr><td>Interruptions</td><td>Backgrounding/low memory must not lose data</td></tr>
</tbody>
</table>
<p>Real testers using the app for real work surface data-integrity issues you would never hit in a quick test. See <a href="/blog/offline-first-apps-and-closed-testing-best-practices">offline-first best practices</a>.</p>

<h2 id="sync">Testing sync and cross-device consistency</h2>
<p>Many productivity apps sync across devices and platforms, and sync is a notorious source of bugs. Test that changes made on one device appear correctly on another, that conflicts from concurrent edits resolve sensibly without data loss, and that sync behaves correctly after being offline. Sync bugs — lost changes, duplicated items, stale data, or conflicts that overwrite work — are among the most damaging problems a productivity app can have, and they only surface with real multi-device use.</p>
<p>During your closed test, have testers use the app across multiple devices where possible, and deliberately create scenarios where they edit the same content from different places or go offline and return. Watch for any loss or corruption. Because sync problems depend on timing, connectivity, and real usage patterns, they are exactly the kind of issue that a closed test with real testers on varied devices and networks is designed to reveal before your users lose important work. See <a href="/blog/network-condition-testing-for-android-apps">network condition testing</a>.</p>

<h2 id="cross-device">Tablet and large-screen support</h2>
<p>Productivity apps are frequently used on tablets and large screens, where users expect layouts that take advantage of the extra space rather than a stretched phone UI. Test that your app adapts well to tablets, with sensible use of the larger canvas, proper handling of split-screen and multi-window, and correct behavior on foldables. Google increasingly emphasizes large-screen quality, and a productivity app that neglects tablets misses a key part of its audience and may score poorly on large-screen guidelines.</p>
<p>During your window, ensure some testers use tablets or large screens and report layout and usability issues. Confirm the app is genuinely usable and pleasant on a bigger canvas, not merely functional. Real testers on varied form factors reveal the large-screen problems that a phone-only development process misses, and getting this right broadens your app's appeal and improves its standing on the increasingly large-screen-aware Play Store. See <a href="/blog/tablet-layout-testing-for-google-play-apps">tablet layout testing</a>.</p>

<h2 id="track-setup">Setting up your closed-testing track</h2>
<p>Once your signed release build is ready, create a closed-testing track in the Play Console and upload it, add testers by email or Google Group, and share the opt-in link each tester must use before installing. Correct configuration matters because the 14-day clock counts only opted-in testers, and a misconfigured track is a common reason developers realize late that their timer never started. Install from the listing on a real device and confirm core create/edit/save and sync flows work before inviting your full group. See <a href="/blog/how-to-create-a-closed-testing-track-in-play-console">how to create a closed testing track</a>.</p>
<p>Give testers clear onboarding instructions and ask them to use the app for real work across devices, including tablets. Every failed opt-in is a tester who does not count toward your 12, so smooth guidance maximizes active testers from day one and gives you the device-diverse, real-usage coverage a productivity app needs.</p>

<h2 id="recruiting">Recruiting and managing the window</h2>
<p>You need 12+ committed, device-diverse testers for 14 continuous days, and productivity apps benefit from testers who use the app for genuine work rather than opening it once. Recruit a buffer above 12, keep testers engaged with clear tasks and quick responses, and direct them to exercise data, sync, and large-screen scenarios. Monitor your active count in the Play Console and recruit replacements early if it slips.</p>
<p>If assembling a reliable, device-diverse group is your bottleneck, a service that supplies verified real testers solves it quickly. You can <a href="https://app.fasttesters.com/">submit your app</a> to get started, and read <a href="/blog/where-to-find-real-android-app-testers">where to find real testers</a> and <a href="/blog/how-to-keep-testers-engaged-during-closed-testing">how to keep testers engaged</a>.</p>

<h2 id="real-device">Why real-device testing matters for productivity apps</h2>
<p>Productivity apps run across an enormous range of devices, form factors, and usage patterns, and the issues that hurt them most — data loss under memory pressure, sync conflicts across devices, layout problems on tablets — only appear with real, varied use. A single development device using the app briefly will never surface the corruption that happens when the system kills the app mid-edit on a low-memory phone, or the sync conflict that arises when two devices edit the same note. Real testers using the app for real work across varied hardware are the only reliable way to find these.</p>
<p>This is why the closed-testing requirement, built on real opt-in testers, delivers genuine value for productivity apps. Real usage across diverse devices surfaces the reliability and consistency issues that define whether users trust your app with their work. The window is your structured chance to prove that trust is warranted before people commit their notes, tasks, and documents to your app, and device diversity in your tester group makes that validation meaningful.</p>

<h2 id="to-production">From closed testing to production</h2>
<p>When your 14 continuous days with 12+ testers complete, request production access in the Play Console. For a productivity app, confirm data integrity, sync reliability, and large-screen support are all solid before you submit, since these define the user trust your category depends on. Preparing your listing in parallel during the window lets you submit immediately rather than losing more time. See <a href="/blog/what-happens-after-14-days-of-closed-testing">what happens after 14 days</a>.</p>

<h2 id="quality">Making the 14-day window count</h2>
<p>Because the requirement forces you to test anyway, extract genuine value from the window rather than treating it as a formality. For a productivity app, that means proving data integrity, sync reliability, and large-screen quality with real users doing real work. Brief your testers clearly, ask them to use the app for genuine tasks across devices, and treat their reports as a chance to earn the trust your category depends on before people commit their notes, tasks, and documents to your app.</p>
<p>A well-run window turns a mandatory delay into a materially more trustworthy product. Enter production having resolved the data-loss, sync, and layout issues your testers surfaced, and you avoid the brutal reviews that a productivity app earns when it loses someone's work. The 14 days are an investment in the reliability that defines whether users adopt or abandon your app. See <a href="/blog/app-testing-checklist-before-release">the testing checklist</a>.</p>

<h2 id="feedback">Turning tester feedback into fixes</h2>
<p>The value of your closed test scales with how well you capture and act on feedback. Give testers a frictionless way to report problems and ask specific questions: did anything you created ever disappear, did sync work across your devices, did the tablet layout feel right, did the app ever lose work when interrupted? Concrete questions produce the actionable reports that let you fix the data-integrity and sync issues most likely to hurt a productivity app.</p>
<p>Then close the loop: when you ship a build addressing reported issues, tell testers what changed and ask them to reconfirm across their devices. This validates fixes across diverse hardware and real usage and keeps testers engaged. A productivity app that enters production having already resolved its data and sync problems launches with the reliability its users demand. See <a href="/blog/crash-reports-during-closed-testing-fix-before-production">fixing crashes before production</a>.</p>

<h2 id="timeline">A realistic timeline for your launch</h2>
<p>Plan backward from the 14-day minimum. Expect a few days up front to finalize your build, recruit and onboard device-diverse testers (including some on tablets), and confirm opt-ins before your continuous window truly begins. The 14 days then run while you fix issues and ship updates, and production review takes additional days. Budgeting three to four weeks end to end, rather than exactly 14, keeps your productivity app's launch aligned with reality.</p>
<p>Developers who hit their dates front-load recruitment and listing preparation so nothing blocks them when the window closes. If tester recruitment is your uncertain variable, resolving it early through your network or a service supplying verified real testers is the highest-leverage step for keeping your launch on schedule. See <a href="/blog/how-to-get-12-testers-without-friends-or-family">getting 12 testers without friends or family</a>.</p>

<h2 id="internal">Use internal testing before your closed test</h2>
<p>The Play Console's internal testing track is faster than the closed track and ideal for a first pass. For a productivity app, use it to shake out obvious data-handling and sync problems with a small trusted group before your counted 14-day window begins. Catching a save or sync bug privately, rather than during your closed test, protects your testers' goodwill and prevents losing days of your continuous window to a build that risks users' work.</p>
<p>A practical rhythm is to validate each release candidate on the internal track, confirm create/edit/save and sync on a couple of real devices, then promote it to the closed track where your counted testers live. This staging discipline keeps the closed track stable and your feedback focused on real reliability. Treating internal testing as staging and closed testing as the requirement keeps your window productive. See <a href="/blog/google-play-internal-testing-vs-closed-testing">internal vs closed testing</a>.</p>

<h2 id="takeaways">Key takeaways</h2>
<ul>
<li><strong>Productivity apps must meet the 12-tester, 14-day requirement</strong> like any app.</li>
<li><strong>Protect data integrity</strong> — never lose or corrupt user content.</li>
<li><strong>Test sync and conflict handling</strong> across multiple devices.</li>
<li><strong>Support tablets and large screens</strong> properly, not with stretched phone UI.</li>
<li><strong>Have testers use the app for real work</strong> to surface reliability issues.</li>
</ul>

<h2 id="faq">Frequently asked questions</h2>
<h3>Do productivity apps need closed testing?</h3>
<p>Yes. On a new personal account, the 12-tester, 14-day requirement applies to productivity apps.</p>
<h3>What's the biggest risk for a productivity app?</h3>
<p>Data loss or corruption. Users trust these apps with their work, so save, autosave, and sync reliability are paramount.</p>
<h3>How do I test sync properly?</h3>
<p>Use multiple devices, create concurrent-edit and offline scenarios deliberately, and confirm no changes are lost, duplicated, or overwritten.</p>
<h3>Why does tablet support matter?</h3>
<p>Productivity apps are heavily used on large screens, and Google emphasizes large-screen quality. A stretched phone UI hurts appeal and scoring.</p>
<h3>How do I find productivity app testers?</h3>
<p>Use your network, communities, or a service, prioritizing device diversity and testers who will use the app for genuine work.</p>
<h3>Should I use internal testing first?</h3>
<p>Yes. Shake out data-handling and sync bugs on the faster internal track before your counted closed-testing window begins, so you do not waste days on avoidable issues.</p>
`,
  },
  {
    slug: 'multi-language-apps-and-google-play-closed-testing',
    readTime: '11 min read',
    content: `
<p>Apps that support multiple languages open themselves to a global audience, but localization introduces a whole class of bugs that single-language apps never face — from text that overflows its buttons to dates and numbers formatted wrongly for a locale. Before a multi-language app published from a new personal account can reach production, it must complete a closed test with at least 12 testers opted in for 14 continuous days. This guide covers closed testing for multi-language apps and the localization-specific issues to prioritize during your window.</p>
<p>The closed-testing process is the same as for any app, but multi-language apps need testing across their supported languages and locales, ideally with testers who actually read those languages. Using your testing window to validate localization thoroughly turns the mandatory wait into real quality assurance for your global launch.</p>

<h2 id="requirement">The requirement applies to multi-language apps</h2>
<p>There is no exemption for multi-language apps. The closed-testing requirement is tied to your developer account type, so a multi-language app on a new personal account must complete a closed test with 12+ testers for 14 continuous days before production access. See <a href="/blog/google-play-closed-testing-guide-how-to-get-12-testers-for-14-days">the closed testing guide</a>. For localization coverage, testers who read your supported languages are especially valuable.</p>
<p>Standard advice applies: recruit committed, device-diverse testers, keep your count above 12, and prepare your listing in parallel. Multi-language apps additionally benefit from language-diverse testers and from localizing your store listing itself.</p>

<h2 id="localization-bugs">Common localization bugs</h2>
<p>Localization introduces bugs that are easy to miss if you only test in your own language. Translated text is often longer or shorter than the original, causing overflow, truncation, or awkward layouts; dates, times, numbers, and currencies must format correctly per locale; and some languages have specific typographic and pluralization rules. An app that looks perfect in English can have broken buttons and clipped labels in German or Finnish, where words are longer. Testing each supported language on real devices is the only reliable way to catch these. See Google's <a href="https://developer.android.com/guide/topics/resources/localization">localization documentation</a>.</p>
<table>
<thead>
<tr><th>Localization test focus</th><th>Why it matters</th></tr>
</thead>
<tbody>
<tr><td>Text expansion/truncation</td><td>Longer translations break layouts</td></tr>
<tr><td>Date/number/currency format</td><td>Must match each locale</td></tr>
<tr><td>Pluralization</td><td>Rules differ across languages</td></tr>
<tr><td>Missing translations</td><td>Untranslated strings look broken</td></tr>
<tr><td>Right-to-left languages</td><td>Layout must mirror correctly</td></tr>
</tbody>
</table>
<p>Language-diverse testers catch mistranslations and layout breaks you cannot. See <a href="/blog/rtl-language-support-testing-for-android-apps">RTL support testing</a>.</p>

<h2 id="rtl">Right-to-left language support</h2>
<p>If you support right-to-left languages like Arabic or Hebrew, your entire layout must mirror correctly: text alignment, navigation direction, icons, and the flow of the interface all reverse. RTL support is a common source of subtle bugs, since elements that were not built with mirroring in mind can end up misaligned or backwards. Testing RTL languages on real devices, ideally with testers who read them, is essential to confirm the mirrored layout is correct and natural rather than merely translated.</p>
<p>During your window, have testers who read RTL languages use the app and report anything that feels wrong — misaligned elements, incorrect navigation direction, or text that does not flow naturally. RTL issues are frequently invisible to developers who do not read the language, which is exactly why real, language-competent testers are so valuable. Getting RTL right signals real quality to users in those markets and avoids the broken-feeling experience of a half-mirrored interface. See <a href="/blog/ui-testing-before-publishing">UI testing before publishing</a>.</p>

<h2 id="translation-quality">Translation quality and context</h2>
<p>Beyond layout, the quality of your translations matters. Machine translation without review often produces awkward, incorrect, or embarrassing text, and words that are ambiguous out of context can be mistranslated. Testers who natively read a language can catch translations that are technically correct but unnatural, culturally off, or wrong in context — the kind of issue that makes an app feel foreign and untrustworthy to native speakers. This qualitative feedback is something only competent human testers provide.</p>
<p>During your closed test, ask language-competent testers to review the app's text critically, not just check that it functions. Have them flag anything that reads unnaturally or seems mistranslated. Good localization is a competitive advantage in global markets, and poor localization is a quick way to lose users who feel the app was not truly made for them. Your testing window is the ideal time to gather and act on this native-speaker feedback before launch. See <a href="/blog/google-play-store-listing-optimization-before-launch">listing optimization</a>.</p>

<h2 id="track-setup">Setting up your closed-testing track</h2>
<p>Once your signed release build is ready, create a closed-testing track in the Play Console and upload it, add testers by email or Google Group, and share the opt-in link each tester must use before installing. Correct configuration matters because the 14-day clock counts only opted-in testers, and a misconfigured track is a common reason developers realize late that their timer never started. Consider localizing your store listing for your key markets too, and install on a real device to verify language switching before inviting your group. See <a href="/blog/how-to-create-a-closed-testing-track-in-play-console">how to create a closed testing track</a>.</p>
<p>Give testers clear onboarding instructions and ask them to test in specific languages, ideally ones they read natively. Every failed opt-in is a tester who does not count toward your 12, so smooth guidance maximizes active testers from day one and gives you the language- and device-diverse coverage a multi-language app needs.</p>

<h2 id="recruiting">Recruiting and managing the window</h2>
<p>You need 12+ committed, device-diverse testers for 14 continuous days, and for multi-language apps, testers who read your supported languages add disproportionate value. Recruit a buffer above 12, keep testers engaged with clear tasks and quick responses, and assign languages to testers so each supported locale gets real coverage. Monitor your active count in the Play Console and recruit replacements early if it slips.</p>
<p>If assembling a language- and device-diverse group is your bottleneck, a service with access to diverse testers can help, supplemented by your own network of language-competent contacts. You can <a href="https://app.fasttesters.com/">submit your app</a> to get started, and read <a href="/blog/where-to-find-real-android-app-testers">where to find real testers</a>.</p>

<h2 id="real-device">Why real-device testing matters here</h2>
<p>Localization bugs are notoriously hard to catch without real devices and real language competence. Text expansion depends on the actual rendered font and screen, locale formatting depends on device settings, and RTL mirroring must be seen to be verified. A developer testing only in their own language on one device will miss the overflow, truncation, and mirroring issues that plague other locales. Real testers switching to their languages on their devices are the only reliable way to see the app as those users will.</p>
<p>This is why the closed-testing window, built on real opt-in testers, is genuinely valuable for multi-language apps. Language-diverse testers surface the layout breaks, formatting errors, and translation problems that would otherwise reach international users and undermine your global launch. The window is your structured chance to validate every supported language before release, and language and device diversity in your tester group is what makes that validation trustworthy.</p>

<h2 id="to-production">From closed testing to production</h2>
<p>When your 14 continuous days with 12+ testers complete, request production access in the Play Console. For a multi-language app, confirm every supported language renders correctly, formats properly, and reads naturally, and that RTL support is solid, before you submit. Localizing your listing in parallel during the window strengthens your global launch. See <a href="/blog/what-happens-after-14-days-of-closed-testing">what happens after 14 days</a>.</p>

<h2 id="quality">Making the 14-day window count</h2>
<p>Because the requirement forces you to test anyway, extract genuine value from the window rather than treating it as a formality. For a multi-language app, that means proving every supported language renders, formats, and reads correctly with testers who actually read those languages. Brief your testers clearly, assign languages so each locale gets coverage, and treat their reports as a chance to polish the localization that determines whether international users feel the app was truly made for them.</p>
<p>A well-run window turns a mandatory delay into a materially better global product. Enter production having resolved the overflow, truncation, formatting, and translation issues your testers surfaced, and you avoid the broken-feeling experience that drives away users in markets you worked hard to reach. The 14 days are an investment in a launch that works everywhere, not just in your own language. See <a href="/blog/app-testing-checklist-before-release">the testing checklist</a>.</p>

<h2 id="feedback">Turning tester feedback into fixes</h2>
<p>The value of your closed test scales with how well you capture and act on feedback. Give testers a frictionless way to report problems and ask specific questions in each language: did any text overflow or get cut off, did dates and numbers look right, did anything read unnaturally, did the layout mirror correctly for RTL? Concrete questions produce the actionable reports that let you fix the localization issues most likely to hurt your app in international markets.</p>
<p>Then close the loop: when you ship a build addressing reported issues, tell testers what changed and ask them to reconfirm in their language on their device. This validates fixes across locales and hardware and keeps testers engaged. A multi-language app that enters production having already resolved its localization problems launches ready for a global audience rather than embarrassing itself in half its markets. See <a href="/blog/crash-reports-during-closed-testing-fix-before-production">fixing crashes before production</a>.</p>

<h2 id="timeline">A realistic timeline for your launch</h2>
<p>Plan backward from the 14-day minimum. Expect a few days up front to finalize your build, recruit and onboard language- and device-diverse testers, and confirm opt-ins before your continuous window truly begins. The 14 days then run while you fix issues and ship updates, and production review takes additional days. Budgeting three to four weeks end to end, rather than exactly 14, keeps your multi-language launch aligned with reality.</p>
<p>Developers who hit their dates front-load recruitment — including finding testers for each language — and localize their listing in parallel. If assembling language-competent testers is your bottleneck, resolving it early through your network or a service with access to diverse testers is the highest-leverage step for keeping your launch on schedule. See <a href="/blog/how-to-get-12-testers-without-friends-or-family">getting 12 testers without friends or family</a>.</p>

<h2 id="internal">Use internal testing before your closed test</h2>
<p>The Play Console's internal testing track is faster than the closed track and ideal for a first pass. For a multi-language app, use it to shake out obvious layout breaks and missing translations across languages with a small trusted group before your counted 14-day window begins. Catching an overflowing button or an untranslated screen privately, rather than during your closed test, protects your testers' goodwill and keeps your continuous window focused on quality.</p>
<p>A practical rhythm is to validate each release candidate on the internal track, switch through your supported languages on a couple of real devices, then promote it to the closed track where your counted, language-competent testers live. This staging discipline keeps the closed track stable and your feedback focused on real localization quality. Treating internal testing as staging and closed testing as the requirement keeps your window productive. See <a href="/blog/google-play-internal-testing-vs-closed-testing">internal vs closed testing</a>.</p>

<h2 id="takeaways">Key takeaways</h2>
<ul>
<li><strong>Multi-language apps must meet the 12-tester, 14-day requirement</strong> like any app.</li>
<li><strong>Test every language for expansion, truncation, and formatting.</strong></li>
<li><strong>Verify RTL mirroring</strong> with testers who read those languages.</li>
<li><strong>Check translation quality and context</strong>, not just function.</li>
<li><strong>Prioritize language-competent testers</strong> for real localization coverage.</li>
</ul>

<h2 id="faq">Frequently asked questions</h2>
<h3>Do multi-language apps need closed testing?</h3>
<p>Yes. On a new personal account, the 12-tester, 14-day requirement applies to multi-language apps.</p>
<h3>What are the most common localization bugs?</h3>
<p>Text overflow or truncation from expansion, wrong date/number/currency formatting, missing translations, and broken RTL layouts.</p>
<h3>Why do I need language-competent testers?</h3>
<p>They catch mistranslations, unnatural phrasing, and RTL problems that developers who do not read the language cannot see.</p>
<h3>Should I localize my store listing too?</h3>
<p>Yes. Localizing your listing for key markets improves discoverability and conversion alongside a localized app.</p>
<h3>How do I cover many languages with 12 testers?</h3>
<p>Assign specific languages to testers who read them, so each supported locale gets genuine coverage during the window.</p>
<h3>Does text expansion really break layouts?</h3>
<p>Yes. Translations are often much longer than the original, so buttons and labels that fit in English can overflow or truncate in languages like German or Finnish.</p>
<h3>Should I localize before or during testing?</h3>
<p>Localize before, then use the window to verify each language on real devices with native readers, fixing overflow, formatting, and translation issues you find.</p>
`,
  },
  {
    slug: 'testing-utility-apps-play-store-compliance-tips',
    readTime: '11 min read',
    content: `
<p>Utility apps — flashlights, file managers, cleaners, scanners, converters, and similar single-purpose tools — are useful and popular, but they also occupy a category Google watches closely for low-value, misleading, or permission-hungry apps. Before a utility app published from a new personal account can reach production, it must complete a closed test with at least 12 testers opted in for 14 continuous days, and it must satisfy policies around functionality, permissions, and honest representation. This guide covers compliance tips for utility apps and the category-specific issues to prioritize during your window.</p>
<p>The closed-testing process is the same as for any app, but utility apps face particular scrutiny for adding genuine value, requesting only necessary permissions, and not overstating what they do. Using your testing window to confirm both quality and honest, minimal-permission compliance is essential in a category where these are common failure points.</p>

<h2 id="requirement">The requirement applies to utility apps</h2>
<p>There is no exemption for utility apps. The closed-testing requirement is tied to your developer account type, so a utility app on a new personal account must complete a closed test with 12+ testers for 14 continuous days before production access. See <a href="/blog/google-play-closed-testing-guide-how-to-get-12-testers-for-14-days">the closed testing guide</a>. Given the scrutiny utility apps receive, prepare compliance in parallel with testing.</p>
<p>Standard advice applies: recruit committed, device-diverse testers, keep your count above 12, and prepare your listing in parallel. For utility apps, permission minimalism and honest representation are the areas that most need attention.</p>

<h2 id="functionality">Functionality and value</h2>
<p>Like wrapper apps, utility apps must clear a minimum-functionality bar and avoid being low-value or duplicative. Google's policies discourage apps that provide little genuine utility, that duplicate existing functionality without adding value, or that exist mainly to serve ads. Your utility app should do something genuinely useful and do it well. Use your window to confirm your app provides real value and works reliably, since a thin or broken utility risks rejection or poor reviews. Review the <a href="https://support.google.com/googleplay/android-developer/answer/9888077">minimum functionality and spam guidance</a>.</p>
<p>Be honest about what your app does. Utility apps have a reputation for overpromising — cleaners that claim dramatic performance gains, battery savers that cannot deliver, and similar. Overstating capabilities is both a policy risk and a fast route to angry reviews. Ensure your app's actual behavior matches its promises, and let your closed test confirm the value is real before launch. See <a href="/blog/app-not-eligible-for-production-access">app not eligible for production access</a>.</p>

<h2 id="permissions">Permission minimalism</h2>
<p>Utility apps are frequently flagged for requesting more permissions than they need. A flashlight app that requests contacts, a file manager that wants location — these mismatches between function and permissions attract scrutiny and erode user trust. Request only the permissions your utility genuinely requires, justify each in context, and handle denial gracefully. Excessive or unjustified permissions are a leading cause of both rejection and one-star reviews for utility apps, so minimalism here is both compliance and good practice.</p>
<table>
<thead>
<tr><th>Utility permission check</th><th>What to verify</th></tr>
</thead>
<tbody>
<tr><td>Necessity</td><td>Every permission maps to a real feature</td></tr>
<tr><td>Contextual request</td><td>Ask when needed, with explanation</td></tr>
<tr><td>Graceful denial</td><td>App works or degrades cleanly if denied</td></tr>
<tr><td>Sensitive permissions</td><td>Extra justification; scrutinized closely</td></tr>
</tbody>
</table>
<p>Audit your permissions during your window and remove any you cannot justify. See <a href="/blog/camera-and-microphone-apps-testing-checklist">sensitive-permission testing</a>.</p>

<h2 id="what-to-test">What to test in a utility app</h2>
<p>Utility apps are used quickly and often, so reliability and speed matter. Test that the core function works flawlessly across devices, that the app is fast to launch and responsive, and that it behaves correctly across Android versions and manufacturer skins — utility apps often touch system features that vary by device. Because users judge utilities harshly on whether they simply work, any inconsistency across hardware is a real problem, making device-diverse testing important.</p>
<p>Also test edge cases specific to your utility: a file manager with unusual file types and permissions, a scanner in poor lighting, a converter with extreme inputs. These edge cases are where utility apps often break, and real testers using the app naturally will surface them. Confirm the app degrades gracefully rather than crashing, and that its single core purpose is rock-solid across the range of devices your users have. See <a href="/blog/performance-testing-guide-for-android-apps">performance testing</a>.</p>

<h2 id="track-setup">Setting up your closed-testing track</h2>
<p>Once your signed release build is ready, create a closed-testing track in the Play Console and upload it, add testers by email or Google Group, and share the opt-in link each tester must use before installing. Correct configuration matters because the 14-day clock counts only opted-in testers, and a misconfigured track is a common reason developers realize late that their timer never started. Install from the listing on a real device and confirm the core function and permission flows work before inviting your full group. See <a href="/blog/how-to-create-a-closed-testing-track-in-play-console">how to create a closed testing track</a>.</p>
<p>Give testers clear onboarding instructions and ask them to exercise the core function and edge cases across their devices. Every failed opt-in is a tester who does not count toward your 12, so smooth guidance maximizes active testers from day one and gives you the device-diverse coverage a utility app needs.</p>

<h2 id="recruiting">Recruiting and managing the window</h2>
<p>You need 12+ committed, device-diverse testers for 14 continuous days. Recruit a buffer above 12, keep testers engaged with clear tasks and quick responses, and direct them to test the core function across devices and Android versions. Monitor your active count in the Play Console and recruit replacements early if it slips. Actively managing the window is the biggest factor in clearing it on the first attempt.</p>
<p>If assembling a reliable, device-diverse group is your bottleneck, a service that supplies verified real testers solves it quickly. You can <a href="https://app.fasttesters.com/">submit your app</a> to get started, and read <a href="/blog/where-to-find-real-android-app-testers">where to find real testers</a> and <a href="/blog/how-to-keep-testers-engaged-during-closed-testing">how to keep testers engaged</a>.</p>

<h2 id="real-device">Why real-device testing matters for utility apps</h2>
<p>Utility apps often interact with system features — files, storage, hardware like the flashlight or camera, system settings — that behave differently across manufacturers and Android versions. A file manager that works on your device may hit storage-permission or path issues on another; a flashlight may control the LED differently across hardware. These device-specific behaviors are invisible in single-device development and only surface with real testers on varied devices, which is exactly what a closed test provides.</p>
<p>This is why the closed-testing requirement, built on real opt-in testers, is genuinely useful even for a simple utility. Real testers using your app across diverse hardware surface the compatibility and reliability issues that determine whether your utility just works everywhere or fails on common devices. The window is your structured chance to confirm your single core purpose is dependable across the market, and device diversity in your tester group is what makes that confidence real.</p>

<h2 id="rejection">Common reasons utility apps get rejected</h2>
<p>Utility apps hit a recognizable set of rejection causes: insufficient functionality or low value, excessive or unjustified permissions, misleading claims about what the app does, and deceptive behavior such as unexpected ads or misrepresented capabilities. Because utilities are a category prone to low-effort and misleading apps, they receive extra scrutiny, and the bar for genuine value and honest representation is enforced firmly.</p>
<p>Use your window to audit against these pitfalls: confirm your app provides real value and works reliably, remove any permission you cannot justify, ensure your claims match reality, and avoid deceptive patterns. Catching these before you request production access prevents the common utility-app rejection cycle. See <a href="/blog/ad-supported-apps-and-google-play-ad-policy-testing">ad policy testing</a>.</p>

<h2 id="to-production">From closed testing to production</h2>
<p>When your 14 continuous days with 12+ testers complete, request production access in the Play Console. For a utility app, be especially sure your app clears the functionality bar, requests only justified permissions, and represents itself honestly before you submit. Preparing your listing in parallel during the window lets you submit immediately rather than losing more time. See <a href="/blog/what-happens-after-14-days-of-closed-testing">what happens after 14 days</a>.</p>

<h2 id="quality">Making the 14-day window count</h2>
<p>Because the requirement forces you to test anyway, extract genuine value from the window rather than treating it as a formality. For a utility app, that means proving your single core purpose is rock-solid across devices, that permissions are minimal and justified, and that the app represents itself honestly. Brief your testers clearly, ask them to hammer the core function and edge cases across their devices, and treat their reports as a chance to strengthen a category that Google scrutinizes closely.</p>
<p>A well-run window turns a mandatory delay into a materially better product and a smoother review. Enter production having confirmed reliability across hardware and removed any unjustified permission, and you avoid the rejections and one-star reviews that plague thin or permission-hungry utilities. The 14 days are an investment in proving your utility simply works everywhere. See <a href="/blog/app-testing-checklist-before-release">the testing checklist</a>.</p>

<h2 id="feedback">Turning tester feedback into fixes</h2>
<p>The value of your closed test scales with how well you capture and act on feedback. Give testers a frictionless way to report problems and ask specific questions: did the core function work reliably on your device, was it fast, did any permission prompt seem unnecessary, did the app do what its listing promised? Concrete questions produce the actionable reports that let you fix the reliability and trust issues most likely to hurt a utility app.</p>
<p>Then close the loop: when you ship a build addressing reported issues, tell testers what changed and ask them to reconfirm on their device. This validates fixes across diverse hardware and Android versions and keeps testers engaged. A utility app that enters production having already resolved its compatibility and permission concerns launches ready to earn trust rather than suspicion. See <a href="/blog/crash-reports-during-closed-testing-fix-before-production">fixing crashes before production</a>.</p>

<h2 id="timeline">A realistic timeline for your launch</h2>
<p>Plan backward from the 14-day minimum. Expect a few days up front to finalize your build, recruit and onboard device-diverse testers, and confirm opt-ins before your continuous window truly begins. The 14 days then run while you fix issues and ship updates, and production review takes additional days. Budgeting three to four weeks end to end, rather than exactly 14, keeps your utility app's launch aligned with reality.</p>
<p>Developers who hit their dates front-load recruitment and listing preparation so nothing blocks them when the window closes. If tester recruitment is your uncertain variable, resolving it early through your network or a service supplying verified real testers is the highest-leverage step for keeping your launch on schedule. See <a href="/blog/how-to-get-12-testers-without-friends-or-family">getting 12 testers without friends or family</a>.</p>

<h2 id="internal">Use internal testing before your closed test</h2>
<p>The Play Console's internal testing track is faster than the closed track and ideal for a first pass. For a utility app, use it to shake out obvious functionality and permission problems with a small trusted group before your counted 14-day window begins. Catching a broken core function or an unnecessary permission privately, rather than during your closed test, protects your testers' goodwill and keeps your continuous window focused on quality.</p>
<p>A practical rhythm is to validate each release candidate on the internal track, confirm the core function and permission flows on a couple of real devices and Android versions, then promote it to the closed track where your counted testers live. This staging discipline keeps the closed track stable and your feedback focused on real reliability. Treating internal testing as staging and closed testing as the requirement keeps your window productive. See <a href="/blog/google-play-internal-testing-vs-closed-testing">internal vs closed testing</a>.</p>

<h2 id="takeaways">Key takeaways</h2>
<ul>
<li><strong>Utility apps must meet the 12-tester, 14-day requirement</strong> like any app.</li>
<li><strong>Clear the minimum-functionality bar</strong> — provide genuine, reliable value.</li>
<li><strong>Request only necessary permissions</strong> and justify each one.</li>
<li><strong>Represent your app honestly</strong> — no overstated claims.</li>
<li><strong>Test the core function across diverse devices</strong> and Android versions.</li>
</ul>

<h2 id="faq">Frequently asked questions</h2>
<h3>Do utility apps need closed testing?</h3>
<p>Yes. On a new personal account, the 12-tester, 14-day requirement applies to utility apps.</p>
<h3>Why are utility apps scrutinized so closely?</h3>
<p>The category is prone to low-value, misleading, and permission-hungry apps, so Google enforces functionality and honesty standards firmly.</p>
<h3>How many permissions should a utility app request?</h3>
<p>Only those genuinely required for its function, each justified in context. Excess permissions cause rejection and poor reviews.</p>
<h3>Can I claim my cleaner boosts performance?</h3>
<p>Only if it genuinely does. Overstated performance or battery claims are a policy risk and generate angry reviews.</p>
<h3>How do I find utility app testers?</h3>
<p>Use your network, communities, or a service, prioritizing device diversity since utilities touch device-specific system features.</p>
`,
  },
  {
    slug: 'sideloading-vs-play-store-testing-why-it-matters',
    readTime: '10 min read',
    content: `
<p>When faced with Google Play's closed-testing requirement, some developers wonder whether they can skip it by distributing their app another way — sideloading APKs directly, or using alternative stores. It is worth understanding clearly what sideloading is, how it differs from Play Store testing, and why, if your goal is a successful Google Play launch, there is no substitute for completing the closed-testing requirement. This guide explains the difference and why the 12-tester, 14-day process matters for a real Play Store presence.</p>
<p>Sideloading and Play Store distribution serve different purposes, and conflating them leads to confusion about the requirement. Understanding the distinction helps you plan realistically rather than chasing a shortcut that does not lead where you want to go.</p>

<h2 id="what-is-sideloading">What sideloading is</h2>
<p>Sideloading means installing an app directly from an APK file rather than through an app store, bypassing the Play Store entirely. Android allows this (with the user enabling installation from unknown sources), and it is useful for internal distribution, personal testing, or getting a build onto a device quickly. Sideloading is not against the rules — it is a legitimate part of the Android ecosystem — but it is fundamentally different from publishing on Google Play.</p>
<p>The key point is that sideloading does not put your app on the Play Store. Users must manually obtain and install the APK, there is no store listing, no discovery, no automatic updates through Play, and none of the trust signals of a Play Store presence. For internal testing it is handy, but as a distribution strategy for a public app it is a poor substitute for the Play Store that most users rely on. See <a href="/blog/google-play-internal-testing-vs-closed-testing">internal vs closed testing</a>.</p>

<h2 id="not-a-shortcut">Why sideloading is not a shortcut</h2>
<p>Some developers hope sideloading lets them avoid the closed-testing requirement. It is true that sideloading does not require closed testing — but that is because sideloading is not Play Store publishing at all. If your goal is to be on the Play Store, where the vast majority of Android users discover and install apps, you must publish there, and publishing from a new personal account requires the closed test. Sideloading does not get you onto the Play Store; it sidesteps it entirely, which is not the same as satisfying its requirements.</p>
<p>In other words, sideloading is not a shortcut to a Play Store launch — it is a different path that leads somewhere else. If you want the reach, discovery, trust, and automatic updates of Google Play, there is no way around completing the closed-testing requirement. Understanding this prevents wasted effort chasing a workaround that cannot deliver what you actually want. See <a href="/blog/google-play-closed-testing-guide-how-to-get-12-testers-for-14-days">the closed testing guide</a>.</p>

<h2 id="testing-uses">Where sideloading fits in testing</h2>
<p>Sideloading does have a legitimate role in your testing process. During development, sideloading a build onto your own devices is a fast way to check functionality before you push to a Play testing track. It is useful for quick iteration, internal QA, and getting builds to close collaborators without the opt-in overhead of the Play tracks. Many developers sideload during early development and then move to Play's internal and closed tracks as they approach launch.</p>
<table>
<thead>
<tr><th>Method</th><th>Best for</th></tr>
</thead>
<tbody>
<tr><td>Sideloading APK</td><td>Quick dev checks, internal QA</td></tr>
<tr><td>Play internal testing</td><td>Fast staging with trusted testers</td></tr>
<tr><td>Play closed testing</td><td>The production-access requirement</td></tr>
<tr><td>Play open testing</td><td>Broader public beta</td></tr>
</tbody>
</table>
<p>Sideloading complements Play testing early on but does not replace the closed-testing requirement. See <a href="/blog/app-testing-checklist-before-release">the testing checklist</a>.</p>

<h2 id="play-benefits">Why the Play Store is worth the requirement</h2>
<p>The closed-testing requirement is real work, but the Play Store is worth it. Google Play is where the overwhelming majority of Android users find and install apps, it provides automatic updates, safety scanning, billing infrastructure, discovery, and the trust that comes with an official store listing. Alternative distribution — sideloading or third-party stores — reaches a tiny fraction of that audience and lacks these benefits. For almost any public app, a Play Store presence is essential, which makes the closed-testing requirement a necessary and worthwhile investment.</p>
<p>Rather than viewing the requirement as an obstacle to avoid, treat it as the entry fee for access to the largest app marketplace in the world. The 14-day window also delivers genuine value if you use it well, producing a more stable, better-tested app. Framed this way, completing closed testing is simply part of doing a proper Play Store launch, not a hurdle to engineer around. See <a href="/blog/what-happens-after-14-days-of-closed-testing">what happens after 14 days</a>.</p>

<h2 id="requirement-recap">Meeting the requirement</h2>
<p>Since there is no substitute, the practical path is to complete the closed test efficiently: recruit 12+ committed, device-diverse testers, keep them opted in for 14 continuous days with a buffer above the minimum, use your testing tracks properly, and prepare your listing in parallel. Sideloading can help you validate builds during development, but the counted window happens on the Play closed track. See <a href="/blog/how-to-create-a-closed-testing-track-in-play-console">how to create a closed testing track</a>.</p>
<p>If recruiting testers is your obstacle — the most common reason developers look for shortcuts in the first place — a service that supplies verified real testers solves it directly, letting you satisfy the requirement rather than trying to avoid it. You can <a href="https://app.fasttesters.com/">submit your app</a> to get started, and read <a href="/blog/where-to-find-real-android-app-testers">where to find real testers</a>.</p>

<h2 id="real-device">Real-device testing still matters</h2>
<p>Whichever method you use during development, real-device testing across diverse hardware remains essential, and the closed-testing window is where you get it at scale with real users. Sideloading onto your own one or two devices tells you little about how your app behaves across the market; the closed test, with device-diverse real testers, is what surfaces the compatibility, performance, and reliability issues that matter. This is another reason the requirement is valuable rather than merely obligatory.</p>
<p>Use the window as genuine QA: brief testers, gather feedback, ship fixes, and monitor Android vitals. Entering production with a clean stability profile across diverse devices is a real benefit of doing closed testing properly, and it is something sideloading to yourself simply cannot provide. See <a href="/blog/google-play-android-vitals-during-closed-testing">Android vitals during closed testing</a>.</p>

<h2 id="misconceptions">Common misconceptions about the requirement</h2>
<p>Much of the confusion around sideloading stems from misconceptions about what the closed-testing requirement is for. Some developers believe it is an arbitrary hurdle, or that any form of testing they have already done should count. In fact, the requirement exists to ensure apps from new personal accounts are genuinely tested by real people before reaching the public, and it is satisfied specifically through the Play closed-testing track — not through sideloaded installs, personal testing, or usage on your own devices. Understanding this clears up why sideloading cannot substitute for it.</p>
<p>Another misconception is that the requirement can be gamed with fake or throwaway testers. Google has signals to detect inauthentic testing, and shortcuts of this kind risk your account rather than helping. The productive interpretation is straightforward: the requirement wants real testers using your app for real, and meeting it honestly — with genuine, device-diverse testers — is both the compliant path and the one that actually improves your app. See <a href="/blog/how-google-detects-fake-testers-and-install-farms">how Google detects fake testers</a>.</p>

<h2 id="use-window">Using the window well instead of avoiding it</h2>
<p>Once you accept that the closed test is unavoidable for a Play Store launch, the smart move is to make it valuable rather than merely endure it. The 14 days are a genuine opportunity to test your app across real, device-diverse users, gather feedback, fix issues, and enter production with a stable, polished app. Developers who reframe the requirement this way stop looking for workarounds like sideloading and instead invest the time in quality, which pays off in better early reviews and fewer post-launch fires.</p>
<p>Brief your testers, give them clear things to try, respond to their feedback, and monitor Android vitals for stability. This turns the mandatory window into the most useful pre-launch testing many indie developers ever do. Far from being the obstacle that tempts people toward sideloading, the closed test — used well — is one of the highest-leverage steps in a proper launch. See <a href="/blog/app-testing-checklist-before-release">the testing checklist</a> and <a href="/blog/google-play-android-vitals-during-closed-testing">Android vitals during closed testing</a>.</p>

<h2 id="alt-stores">Alternative stores and their requirements</h2>
<p>Beyond sideloading, some developers consider alternative app stores. These exist and can complement a Play Store presence, but they reach a small fraction of the Android audience and come with their own submission rules, review processes, and audiences. They are not a way to escape Google's requirement if your goal is Google Play specifically; they are separate channels. For most developers, the Play Store is the primary target, and alternative stores are at best a supplement, not a replacement.</p>
<p>If you do distribute through other channels, treat each on its own terms and do not assume testing or approval in one carries over to another. Your Play Store launch still requires the closed test regardless of what you do elsewhere. Keeping these channels mentally separate prevents the confusion that leads developers to think they have found a shortcut when they have simply changed destinations. See <a href="/blog/publish-app-google-play">publishing on Google Play</a>.</p>

<h2 id="timeline">A realistic timeline for a Play Store launch</h2>
<p>Since the closed test is required, plan for it. Budget a few days up front to finalize your build, recruit and onboard device-diverse testers, and confirm opt-ins before your continuous window begins; the 14 days then run while you fix issues; and production review after you request access takes additional days. Realistically, a Play Store launch from a new personal account takes three to four weeks end to end, not the 14 days alone. Planning for this beats hunting for a workaround that does not exist.</p>
<p>The developers who launch on time front-load recruitment, since finding testers is the most common reason people look for shortcuts. Resolving it early — through your network or a service supplying verified real testers — removes the very bottleneck that makes sideloading tempting, and lets you satisfy the requirement smoothly. See <a href="/blog/how-to-get-12-testers-without-friends-or-family">getting 12 testers without friends or family</a>.</p>

<h2 id="security">Security and trust considerations</h2>
<p>One reason the Play Store is worth the closed-testing requirement is the security and trust layer it provides. Apps distributed through Play are scanned by Google Play Protect, benefit from a verified store presence, and update automatically through a channel users trust. Sideloaded apps carry none of these assurances: users must disable a safety setting to install them, receive no automatic updates, and have no store-backed signal that the app is safe. For most users, an app that must be sideloaded feels risky, which limits its reach far more than the closed test ever would.</p>
<p>From a user's perspective, then, the closed-testing requirement is part of what makes Play apps trustworthy in the first place. By ensuring apps from new accounts are genuinely tested before release, it contributes to the overall quality and safety of the store. Viewed this way, satisfying the requirement is not just a gate you pass through but part of earning the trust that a Play Store listing confers — trust that sideloading simply cannot replicate. See <a href="/blog/publish-app-google-play">publishing on Google Play</a>.</p>

<h2 id="takeaways">Key takeaways</h2>
<ul>
<li><strong>Sideloading is not a shortcut</strong> — it bypasses the Play Store rather than satisfying it.</li>
<li><strong>A Play Store launch requires the closed test</strong> on a new personal account.</li>
<li><strong>Sideloading is useful for quick dev checks</strong> but not for public distribution.</li>
<li><strong>The Play Store's reach and trust</strong> make the requirement worthwhile.</li>
<li><strong>Real-device testing at scale</strong> happens in the closed-testing window.</li>
</ul>

<h2 id="faq">Frequently asked questions</h2>
<h3>Can I avoid closed testing by sideloading?</h3>
<p>Only by not being on the Play Store at all. Sideloading bypasses Play; it does not satisfy the requirement for a Play Store launch.</p>
<h3>Is sideloading against Google's rules?</h3>
<p>No. Sideloading is a legitimate part of Android, useful for development and internal testing, but it is not Play Store publishing.</p>
<h3>When should I sideload during development?</h3>
<p>For quick functionality checks and internal QA before moving to Play's internal and closed testing tracks.</p>
<h3>Why is the Play Store worth the requirement?</h3>
<p>It offers reach, discovery, automatic updates, safety scanning, billing, and trust that alternative distribution cannot match.</p>
<h3>What if recruiting testers is my problem?</h3>
<p>Use a service that supplies verified real testers, so you satisfy the requirement directly instead of seeking a workaround.</p>
<h3>Do alternative app stores avoid the requirement?</h3>
<p>They are separate channels reaching a small fraction of users. They do not satisfy Google Play's requirement if your goal is a Play Store presence.</p>
<h3>How long does a Play Store launch really take?</h3>
<p>Realistically three to four weeks end to end from a new personal account — recruitment, the 14-day window, and production review — not the 14 days alone.</p>
<h3>Can fake testers get me through faster?</h3>
<p>No. Google has signals to detect inauthentic testing, and shortcuts risk your account. Real, device-diverse testers are the compliant and effective path.</p>
`,
  },
  {
    slug: 'offline-first-apps-and-closed-testing-best-practices',
    readTime: '11 min read',
    content: `
<p>Offline-first apps are built to work regardless of connectivity, storing data locally and syncing when a connection is available. This architecture delivers a great experience but introduces complex behavior around data storage, synchronization, and conflict resolution that must be tested carefully. Before an offline-first app published from a new personal account can reach production, it must complete a closed test with at least 12 testers opted in for 14 continuous days. This guide covers best practices for testing offline-first apps during your closed-testing window.</p>
<p>The closed-testing process is the same as for any app, but offline-first apps depend on behavior — offline operation, sync, conflict handling — that only reveals its bugs under real, varied network conditions. Using your testing window to exercise these across real devices and connections turns the mandatory wait into genuine assurance for your app's defining feature.</p>

<h2 id="requirement">The requirement applies to offline-first apps</h2>
<p>There is no exemption for offline-first apps. The closed-testing requirement is tied to your developer account type, so an offline-first app on a new personal account must complete a closed test with 12+ testers for 14 continuous days before production access. See <a href="/blog/google-play-closed-testing-guide-how-to-get-12-testers-for-14-days">the closed testing guide</a>. For offline-first apps, network-diverse testing is especially valuable.</p>
<p>Standard advice applies: recruit committed, device-diverse testers, keep your count above 12, and prepare your listing in parallel. Offline-first apps additionally need testers who will use the app across real, varied, and unreliable connections.</p>

<h2 id="offline-behavior">Testing offline behavior</h2>
<p>The core promise of an offline-first app is that it works without a connection, so this must be tested thoroughly. Confirm that all core functionality is available offline, that data created or edited offline is stored reliably, and that the app never loses work when there is no connection. Test starting the app offline, using it extensively offline, and the full range of operations users perform, since anything that silently requires connectivity breaks the offline-first promise and frustrates users who expected the app to work anywhere.</p>
<table>
<thead>
<tr><th>Offline-first test focus</th><th>Why it matters</th></tr>
</thead>
<tbody>
<tr><td>Full offline functionality</td><td>Core promise of the app</td></tr>
<tr><td>Local data reliability</td><td>Offline work must never be lost</td></tr>
<tr><td>Sync on reconnect</td><td>Changes must upload correctly</td></tr>
<tr><td>Conflict resolution</td><td>Concurrent edits must resolve safely</td></tr>
<tr><td>Intermittent networks</td><td>Flaky connections are the hard case</td></tr>
</tbody>
</table>
<p>Real testers on varied and unreliable networks reveal the offline and sync bugs that matter. See <a href="/blog/network-condition-testing-for-android-apps">network condition testing</a>.</p>

<h2 id="sync">Testing synchronization</h2>
<p>Synchronization is the hardest part of an offline-first app. When connectivity returns, locally stored changes must upload correctly, remote changes must download, and the app must reconcile the two without losing data. Test that sync triggers reliably on reconnection, that it handles large queues of offline changes, and that it recovers from interruptions mid-sync. Sync failures — changes that never upload, data that disappears, or duplicates — are among the most damaging bugs an offline-first app can have, and they undermine the trust the architecture is meant to build.</p>
<p>During your window, have testers work offline, accumulate changes, then reconnect, and confirm everything syncs correctly. Test interrupting sync partway (by killing the connection or the app) and verify it resumes cleanly. Because sync behavior depends on timing, network conditions, and real usage, it is exactly the kind of thing that only reveals its bugs with real testers on real networks — which is why the closed-testing window is so valuable for these apps. See <a href="/blog/analytics-sdk-testing-during-closed-testing">SDK behavior testing</a>.</p>

<h2 id="conflicts">Conflict resolution</h2>
<p>When the same data is edited in multiple places — on different devices, or offline on one device while changed on the server — conflicts arise, and how your app resolves them is critical. A naive approach that simply overwrites can silently destroy a user's work. Test concurrent-edit scenarios deliberately: edit the same item on two devices, or offline and online, and confirm your conflict resolution behaves sensibly and preserves data rather than losing it. Users must never lose work to a conflict they did not even know occurred.</p>
<p>The right conflict strategy depends on your app, but whatever you choose must be tested with real multi-device scenarios during your closed test. Have testers deliberately create conflicts and report any lost or unexpectedly overwritten data. Conflict bugs are subtle and easy to miss in single-device development, so real testers using multiple devices are the reliable way to surface them before they cost your users their work. See <a href="/blog/productivity-apps-meeting-google-play-testing-rules">productivity app testing</a> for related data-integrity practices.</p>

<h2 id="track-setup">Setting up your closed-testing track</h2>
<p>Once your signed release build is ready, create a closed-testing track in the Play Console and upload it, add testers by email or Google Group, and share the opt-in link each tester must use before installing. Correct configuration matters because the 14-day clock counts only opted-in testers, and a misconfigured track is a common reason developers realize late that their timer never started. Install from the listing on a real device and confirm offline operation and sync work before inviting your full group. See <a href="/blog/how-to-create-a-closed-testing-track-in-play-console">how to create a closed testing track</a>.</p>
<p>Give testers clear onboarding instructions and ask them to use the app offline, on flaky connections, and across devices, and to try creating conflicts. Every failed opt-in is a tester who does not count toward your 12, so smooth guidance maximizes active testers from day one and gives you the network- and device-diverse coverage an offline-first app needs.</p>

<h2 id="recruiting">Recruiting and managing the window</h2>
<p>You need 12+ committed, device-diverse testers for 14 continuous days, and for offline-first apps, testers who will genuinely use the app across varied and unreliable networks add the most value. Recruit a buffer above 12, keep testers engaged with clear tasks and quick responses, and direct them to exercise offline, sync, and conflict scenarios. Monitor your active count in the Play Console and recruit replacements early if it slips.</p>
<p>If assembling a reliable, network- and device-diverse group is your bottleneck, a service that supplies verified real testers solves it quickly. You can <a href="https://app.fasttesters.com/">submit your app</a> to get started, and read <a href="/blog/where-to-find-real-android-app-testers">where to find real testers</a> and <a href="/blog/how-to-keep-testers-engaged-during-closed-testing">how to keep testers engaged</a>.</p>

<h2 id="real-device">Why real-network testing matters</h2>
<p>Offline-first behavior is impossible to validate properly without real, varied, and unreliable network conditions. The hardest cases — intermittent connectivity, sync interrupted mid-transfer, conflicts from concurrent edits — arise precisely from the messy reality of mobile networks, which a stable lab connection never reproduces. A developer testing on solid office Wi-Fi will miss the sync failures and data-loss bugs that appear when a real user's connection drops in and out. Real testers on real networks are the only reliable way to see these.</p>
<p>This is why the closed-testing window, built on real opt-in testers, delivers genuine value for offline-first apps. Testers using your app across varied connections surface the offline, sync, and conflict bugs that define whether users can trust your app with their data. The window is your structured chance to validate your defining feature under realistic conditions, and network and device diversity in your tester group is what makes that validation trustworthy.</p>

<h2 id="to-production">From closed testing to production</h2>
<p>When your 14 continuous days with 12+ testers complete, request production access in the Play Console. For an offline-first app, confirm full offline functionality, reliable sync, and safe conflict resolution across devices and networks before you submit. Preparing your listing in parallel during the window lets you submit immediately rather than losing more time. See <a href="/blog/what-happens-after-14-days-of-closed-testing">what happens after 14 days</a>.</p>

<h2 id="quality">Making the 14-day window count</h2>
<p>Because the requirement forces you to test anyway, extract genuine value from the window rather than treating it as a formality. For an offline-first app, that means proving full offline functionality, reliable sync, and safe conflict resolution with real testers on real, unreliable networks. Brief your testers clearly, ask them to work offline and on flaky connections and to deliberately create conflicts, and treat their reports as a chance to harden the defining feature your app is built around.</p>
<p>A well-run window turns a mandatory delay into a materially more trustworthy product. Enter production having resolved the offline, sync, and conflict issues your testers surfaced, and you avoid the data-loss reports that destroy trust in an app whose whole promise is working anywhere. The 14 days are an investment in the reliability that justifies your offline-first architecture. See <a href="/blog/app-testing-checklist-before-release">the testing checklist</a>.</p>

<h2 id="feedback">Turning tester feedback into fixes</h2>
<p>The value of your closed test scales with how well you capture and act on feedback. Give testers a frictionless way to report problems and ask specific questions: did everything work offline, did your changes sync when you reconnected, did anything get lost or duplicated, did a conflict ever overwrite your work? Concrete questions produce the actionable reports that let you fix the offline and sync issues most likely to hurt an offline-first app.</p>
<p>Then close the loop: when you ship a build addressing reported issues, tell testers what changed and ask them to reconfirm across their networks and devices. This validates fixes across varied connectivity and hardware and keeps testers engaged. An offline-first app that enters production having already resolved its sync and conflict problems launches with the reliability its data-centric users demand. See <a href="/blog/crash-reports-during-closed-testing-fix-before-production">fixing crashes before production</a>.</p>

<h2 id="timeline">A realistic timeline for your launch</h2>
<p>Plan backward from the 14-day minimum. Expect a few days up front to finalize your build, recruit and onboard network- and device-diverse testers, and confirm opt-ins before your continuous window truly begins. The 14 days then run while you fix issues and ship updates, and production review takes additional days. Budgeting three to four weeks end to end, rather than exactly 14, keeps your offline-first launch aligned with reality.</p>
<p>Developers who hit their dates front-load recruitment so nothing blocks them when the window closes. Because offline-first apps need testers on varied, unreliable networks and that coverage is hard to assemble alone, resolving your tester source early through your network or a service supplying verified real testers is the highest-leverage step for keeping your launch on schedule. See <a href="/blog/how-to-get-12-testers-without-friends-or-family">getting 12 testers without friends or family</a>.</p>

<h2 id="internal">Use internal testing before your closed test</h2>
<p>The Play Console's internal testing track is faster than the closed track and ideal for a first pass. For an offline-first app, use it to shake out obvious offline and sync problems with a small trusted group before your counted 14-day window begins. Catching a sync bug that loses data privately, rather than during your closed test, protects your testers' goodwill and prevents losing days of your continuous window to a build that risks users' work.</p>
<p>A practical rhythm is to validate each release candidate on the internal track, confirm offline operation and sync on a couple of real devices, then promote it to the closed track where your counted testers live. This staging discipline keeps the closed track stable and your feedback focused on real reliability. Treating internal testing as staging and closed testing as the requirement keeps your window productive. See <a href="/blog/google-play-internal-testing-vs-closed-testing">internal vs closed testing</a>.</p>

<h2 id="takeaways">Key takeaways</h2>
<ul>
<li><strong>Offline-first apps must meet the 12-tester, 14-day requirement</strong> like any app.</li>
<li><strong>Test full offline functionality</strong> — never silently require connectivity.</li>
<li><strong>Validate sync on reconnection</strong>, including interrupted and large-queue cases.</li>
<li><strong>Test conflict resolution</strong> so concurrent edits never lose data.</li>
<li><strong>Prioritize network-diverse testers</strong> on real, unreliable connections.</li>
</ul>

<h2 id="faq">Frequently asked questions</h2>
<h3>Do offline-first apps need closed testing?</h3>
<p>Yes. On a new personal account, the 12-tester, 14-day requirement applies to offline-first apps.</p>
<h3>What's the hardest thing to test in an offline-first app?</h3>
<p>Synchronization and conflict resolution, since they depend on timing, real network conditions, and concurrent edits across devices.</p>
<h3>How do I test sync properly?</h3>
<p>Have testers work offline, accumulate changes, reconnect, and interrupt sync mid-transfer, confirming nothing is lost or duplicated.</p>
<h3>Why do I need real, unreliable networks?</h3>
<p>The worst bugs arise from intermittent connectivity, which stable lab Wi-Fi never reproduces. Real testers on flaky networks reveal them.</p>
<h3>How do I handle edit conflicts?</h3>
<p>Choose a resolution strategy suited to your app and test concurrent-edit scenarios so conflicts resolve safely without losing user work.</p>
<h3>Should I use internal testing first?</h3>
<p>Yes. Shake out offline and sync bugs on the faster internal track before your counted closed-testing window begins, so you do not risk users' data or waste days.</p>
`,
  },
];
