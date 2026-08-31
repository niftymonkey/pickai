# OpenRouter terms and the keyless `/api/v1/models` adapter

**Evidence and reasoning, not legal advice.** Nobody here is a lawyer. What follows is a record of what the primary documents say, what the live endpoint actually returns, and how those facts line up against decision 9.14's choice to ship the OpenRouter benchmark adapter opt-in and off by default. Every quote carries its source and the date it was fetched. Where this note reasons rather than quotes, it says so.

Research date: 2026-08-31. All fetches were made from this machine on 2026-08-31 unless stated otherwise. Question: how much real terms-of-service risk does pickai take by shipping an opt-in `fromOpenRouter` adapter that reads OpenRouter's keyless `/api/v1/models` endpoint?

Context this note answers to: decision 9.11 recorded "silence plus risk, not consent" against the OpenRouter route, and 9.14 shipped the adapter anyway as opt-in. This note tests that read against the sources directly. The short version is that 9.11's characterization was right about the ToS text and incomplete about everything else: the developer documentation, the OpenAPI specification, the endpoint's own HTTP headers, and OpenRouter's treatment of its other data endpoints all say the model list is published for exactly this kind of consumption.

---

## 1. The Terms of Service, quoted

Source: [https://openrouter.ai/terms](https://openrouter.ai/terms), fetched 2026-08-31. The page states its own date on the second line:

> Last Updated: July 29, 2026

That matches the date recorded in 9.11, so the terms have not moved since that research.

### The definitions that scope everything else

The opening paragraph defines both key terms in one sentence:

> Welcome, and thank you for your interest in OpenRouter, Inc. ("OpenRouter," "we," or "us") and our website at https://openrouter.ai/ ("Site"), along with our related websites, networks, applications, and other services provided by us (collectively, our "Service"). These Terms of Service are a legally binding contract between you and OpenRouter regarding your use of the Service.

Section 1 describes what the Service is:

> OpenRouter operates a large language model aggregator where users may use the Site to access third-party application programming interfaces ("APIs") to use a variety of generative artificial intelligence models listed on the Site ("Models"). OpenRouter may add or remove Models from the Service at any time.

Section 12 defines the property interest:

> The Service is owned and operated by OpenRouter. The visual interfaces, graphics, design, compilation, information, data, computer code (including source code or object code), products, software, services, and all other elements of the Service ("Materials") provided by OpenRouter are protected by intellectual property and other laws. All Materials included in the Service are the property of OpenRouter or our third-party licensors. Except as expressly authorized by OpenRouter, you may not make use of the Materials. OpenRouter reserves all rights to the Materials not granted expressly in these Terms.

**Do the definitions cover the public API or only the website and routing service?** Plainly, they cover the API. "Service" is defined to include "our related websites, networks, applications, and other services provided by us", and Section 12's "Materials" expressly includes "information, data". There is no reading on which `/api/v1/models` sits outside the Service. That is the honest answer and it is the unfavorable one. The favorable facts in this note are not about scope; they are about consent, which is section 3 below.

One structural point matters more than it looks. The whole document is framed as a contract formed by acceptance: "BY CLICKING 'I ACCEPT,' OR BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THE FOLLOWING TERMS". Section 3.1 says "To access most features of the Service, you must register for an account." A user who never registers and never clicks accept has a weaker formation story than a customer with an account, though "by using the Service" is written precisely to catch them. Browsewrap of that kind is enforced inconsistently by US courts, and this note does not try to predict the outcome.

### The anti-scrape clause, in full

Section 7 ("Prohibited Conduct") opens "BY USING THE SERVICE, YOU AGREE NOT TO:" and the relevant bullets read, verbatim and in order:

> develop, support or use software, devices, scripts, robots or any other means or processes (such as crawlers, browser plugins, add-ons or any other automated technology) to scrape or copy any information on the Site or the Services;

> bypass any technical measures implemented by OpenRouter that are designed to prevent scraping;

Section 7 closes with:

> attempt to do any of the acts described in this Section 7, or assist or permit any person in engaging in any of the acts described in this Section 7.

The second bullet is the one worth pausing on. It sits immediately after the scrape bullet and prohibits *bypassing technical measures designed to prevent scraping*. `/api/v1/models` has no such measure: it is unauthenticated, `Access-Control-Allow-Origin: *`, and CDN-cached for public reuse (headers in section 3). Reading the two bullets together, the mischief section 7 addresses is taking data OpenRouter did not hand out. Calling a documented endpoint that OpenRouter serves anonymously, with a documented `curl` example, bypasses nothing.

### The competing-service clause, in full

From the same Section 7 list:

> access the Site or Service for purposes of reselling API access to Models or otherwise developing a competing service;

Note the structure: a single bullet whose subject is reselling API access, with "or otherwise developing a competing service" attached to it. Under the interpretive canon *ejusdem generis*, a general phrase trailing a specific one takes color from the specific one. The specific one is reselling inference access.

### What is absent

Searching the extracted text of the full terms (51,916 characters of prose after stripping markup), fetched 2026-08-31: no occurrence of "Artificial Analysis", no occurrence of "attribution", no occurrence of "benchmark", no licensing grant of any kind covering published data. That confirms 9.11's finding. The terms neither permit nor require anything specific about the model list or the benchmark fields inside it.

---

## 2. The developer documentation

Source: [https://openrouter.ai/docs/overview/models.md](https://openrouter.ai/docs/overview/models.md), fetched 2026-08-31. This is OpenRouter's own documentation, served as machine-readable markdown from their docs site.

The page opens:

> Explore and browse 400+ models and providers [on our website](https://openrouter.ai/models), or [with our API](/docs/api/api-reference/models/list-all-models-and-their-properties). You can also subscribe to our [RSS feed](https://openrouter.ai/api/v1/models?use_rss=true) to stay updated on new models.

Every example on that page is a bare `curl` with no `Authorization` header:

> ```
> curl "https://openrouter.ai/api/v1/models"
> ```

> ```
> curl "https://openrouter.ai/api/v1/models?sort=pricing-low-to-high"
> ```

> ```
> curl "https://openrouter.ai/api/v1/models?offset=0&limit=500"
> ```

The section titled "Models API Standard" states the intent in OpenRouter's own words:

> Our [Models API](/docs/api/api-reference/models/list-all-models-and-their-properties) makes the most important information about all LLMs freely available as soon as we confirm it.

and on the schema:

> The Models API returns a standardized JSON response format that provides comprehensive metadata for each available model. This schema is cached at the edge and designed for reliable integration with production applications.

The documentation also demonstrates programmatic filtering of the benchmark payload specifically:

> ```
> # Find models with benchmark data
> curl -s "https://openrouter.ai/api/v1/models" | jq '.data[] | select(.benchmarks) | {id, benchmarks}'
> ```

**How this bears on reading section 7 against API users.** OpenRouter publishes an endpoint that requires no account, documents it with keyless `curl` examples, offers an RSS feed of it (RSS exists to be polled by software on a schedule, by strangers, without accounts), describes it as making information "freely available", and prints a `jq` one-liner for extracting the benchmark fields. A "script" or "automated technology" calling that endpoint is doing the thing the documentation instructs. Section 7's scrape bullet and this documentation are in direct tension, and the ordinary contract reading is that a specific, documented invitation to consume an endpoint governs over a boilerplate general prohibition. This is reasoning, not a quote, and it is the central judgment call in this note.

One clarification on the docs' own claim about the benchmarks field. Its schema section says:

> Present only on models that have been evaluated in third-party benchmarks. Currently includes [Design Arena](https://designarena.org) rankings.

That sentence is stale: the live payload also carries `artificial_analysis` (section 3), and the OpenAPI specification documents it (below). The docs describe less than the API delivers.

### The OpenAPI specification

Source: [https://openrouter.ai/openapi.json](https://openrouter.ai/openapi.json), fetched 2026-08-31, 1,870,971 bytes. It contains 27 occurrences of "Artificial Analysis". The `GET /models` operation documents server-side filtering and sorting on those indices:

> Sort the returned models server-side. Prefer this over fetching the full list and sorting client-side. Options: pricing-low-to-high, pricing-high-to-low (average prompt/completion price), context-high-to-low (context length), throughput-high-to-low, latency-low-to-high (recent median performance), most-popular, top-weekly (tokens processed in the last week), newest (creation date), intelligence-high-to-low, coding-high-to-low, agentic-high-to-low (Artificial Analysis indices), design-arena-elo-high-to-low (best Design Arena ELO across arenas). Models without a score for the chosen benchmark are placed last.

and parameters described as "Minimum Artificial Analysis intelligence index", "Maximum Artificial Analysis intelligence index", "Minimum Artificial Analysis coding index", and so on.

The spec declares a document-level `security: [{apiKey: []}]`, and the `/models` operation declares no operation-level override. So on paper the spec says the endpoint is authenticated. It is not, in fact: the live call succeeds anonymously (section 3). Read carefully, this is a generated-spec default rather than a statement of policy, and the endpoints OpenRouter actually gates say so in their own descriptions (section 5). Recording it here because it is the one documentary fact that cuts against the keyless reading, and 9.14's "opt-in and stated" posture should survive it rather than ignore it.

---

## 3. The live API call

Plain `GET https://openrouter.ai/api/v1/models`, no `Authorization` header, no cookie, from this machine on **2026-08-31 at 21:27 UTC**.

**Result: HTTP 200, 705,337 bytes of JSON.**

Response headers, verbatim, from a `HEAD` at 21:31 UTC the same day:

```
HTTP/2 200
content-type: application/json
cf-cache-status: HIT
access-control-allow-origin: *
cache-control: public, max-age=300, stale-while-revalidate=3600, stale-if-error=3600
```

Those three headers are the operative facts. `Access-Control-Allow-Origin: *` means any web page in any browser may read this endpoint cross-origin, which is a deliberate server configuration and not an accident. `cache-control: public` authorizes shared caches to store and serve it. `cf-cache-status: HIT` means it is being served from Cloudflare's edge rather than computed per caller.

`robots.txt` ([https://openrouter.ai/robots.txt](https://openrouter.ai/robots.txt), fetched 2026-08-31) is:

```
User-Agent: *
Allow: /
Disallow: /seo/
```

Nothing under `/api` is disallowed to automated agents.

### What the payload contains

| Measure | Value on 2026-08-31 | Value recorded August 2026 (9.11) |
| --- | --- | --- |
| Models in `data` | 425 | 396 |
| Models with a `benchmarks` object | 242 | not recorded |
| Models with `benchmarks.artificial_analysis` | **180** | 165 |
| Models with non-empty `benchmarks.design_arena` | 165 | 152 |

So yes: the AA-derived fields are still there, and coverage grew rather than shrank.

Each `artificial_analysis` object carries exactly three keys, on all 180 models: `intelligence_index`, `coding_index`, `agentic_index`. Example, verbatim from the payload:

```json
{"id": "z-ai/glm-5.3-flash", "benchmarks": {"design_arena": [], "artificial_analysis": {"intelligence_index": 57.5, "coding_index": 71.5, "agentic_index": 58.2}}}
```

Those three are precisely AA's free-tier composite set, matching the `FreeEvaluations` schema recorded in `design/research/aa-access.md`. No per-benchmark scores are present.

### License, attribution, and terms fields in the payload

There are none. Searching all 705,337 bytes of the response, fetched 2026-08-31:

- "attribution": **0 occurrences**.
- "copyright": **0 occurrences**.
- "license": 5 occurrences, all inside free-text model `description` strings about model weights ("released under the Apache 2.0 license"). None is a field, and none refers to the data.
- "terms": 1 occurrence, inside a model description ("In terms of...").

The root object has three keys: `data`, `total_count`, `links`. No license block, no terms URL, no attribution string, no source credit for the benchmark numbers. The payload asserts nothing about its own reuse.

---

## 4. The Artificial Analysis laundering question

### Does OpenRouter attribute AA?

On the site, yes, by name. A model page's own meta description, fetched 2026-08-31 from [https://openrouter.ai/openai/gpt-5.2](https://openrouter.ai/openai/gpt-5.2), ends:

> Includes independent benchmarks from Artificial Analysis.

In the API, only as a field name. The key is literally `artificial_analysis`, and the OpenAPI spec labels the sort options "(Artificial Analysis indices)", but there is no attribution string, no link, and no required-credit notice in the response body. So AA is credited publicly and named in the schema, but the JSON itself carries no attribution obligation for a downstream reader to inherit or notice.

That OpenRouter publishes AA data at all, and advertises it in page metadata, is consistent with OpenRouter having a commercial arrangement with AA. AA's Data Platform Terms section 7.2 reserves to AA "the exclusive right to sell, trade, loan, reproduce, disclose, distribute, transfer, or otherwise make available the Data to third parties", which is the clause under which such an arrangement would sit. This note found no public confirmation of a contract between them, and does not assume one beyond noting that the alternative (OpenRouter publishing AA data with no arrangement) is AA's problem with OpenRouter, not pickai's.

### Do AA's terms purport to bind third parties who receive AA numbers via a licensee?

Source: [Artificial Analysis Data Platform Terms v1.1, last revised 2026-08-19](https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf), fetched 2026-08-31.

The obligations run against a defined party:

> 1.2 "Customer" means the individual or entity that has subscribed to a Pro plan, registered for access to the API, or executed an Order Form with Company.

Every restriction pickai cares about is phrased as an obligation of that Customer. Section 2.5: "**Customer** shall not use the Data to develop, operate, or improve any product or service made available to third parties whose primary purpose is benchmarking, ranking, comparison, competitive intelligence, or model/provider selection guidance, without Company's prior written consent." Section 2.4's redistribution list is likewise a list of things Customer shall not do. The license grant in 2.1 is "a restricted, non-exclusive, **non-transferable**, revocable, limited license".

Searching the full extracted text for downstream-binding machinery: there is no clause requiring a Customer to impose these terms on recipients, no flow-down provision, no "shall require any third party to be bound", no sublicensing structure that would carry obligations forward. The only "bound by" language in the document is in section 12.2 and concerns confidentiality obligations of employees and advisors of Commercial customers. Contrast OpenRouter's own terms, which *do* contain explicit flow-down (section 5.2: "You will require that all of your Authorized Users and customers access and use the Service and Models only in accordance with this Agreement"). AA's drafters wrote no equivalent.

**The plain-language consequence, and the honest caveat.** A contract binds its parties. pickai, if it never registers for an AA key and never accepts AA's terms, is not a Customer under 1.2, and the 2.5 model-selection prohibition is not a promise pickai has made to anyone. That is basic contract privity and it is the strongest single fact on this whole page. The caveat is that privity disposes of the *contract* question only. It does not by itself dispose of three others, which are genuinely separate:

- **Contract risk (pickai): very low.** No agreement, no privity, no flow-down clause reaching downstream recipients.
- **Contract risk (OpenRouter's, not pickai's): unknown and not pickai's to carry.** If OpenRouter's arrangement with AA forbids what OpenRouter is doing, the exposure is OpenRouter's. The practical consequence to pickai is that the field could disappear from the payload, which is an availability risk, not a legal one.
- **Copyright and database-right risk: low but non-zero, and jurisdiction-dependent.** Three composite floating-point numbers per model are facts about measurements. In the US, *Feist* holds that facts are not copyrightable and that effort in compiling them does not create protection; a thin compilation copyright can attach to creative selection and arrangement, which three numbers keyed to a model ID does not obviously exhibit. The EU/UK *sui generis* database right is the real variable: it protects substantial investment in obtaining, verifying, or presenting the contents of a database, independent of originality, and AA's investment in running evaluations is exactly the kind of investment it contemplates. Extracting 180 rows of three numbers is a small slice of AA's overall database, which cuts toward "not substantial", but this is the branch on which a confident answer cannot be given from documents alone. A US-domiciled MIT library has less exposure here than an EU-domiciled one.
- **Goodwill risk: real and cheap to manage.** AA has written down, in a public document, that it does not want its data inside model-selection products. Even where they cannot compel it, a note from AA asking pickai to stop is a plausible and unpleasant outcome, and the reasonable response would be to comply. That is a reputational cost, not a legal one, and its size is a judgment about how pickai wants to be seen rather than a question the documents can settle.

---

## 5. OpenRouter's own conduct

This is the section that most changes the 9.11 read, because conduct is where OpenRouter shows how it interprets its own section 7.

### It gates the endpoints it means to gate, and says so

`GET /api/v1/benchmarks` is the rich benchmark endpoint, and its OpenAPI description states, verbatim:

> Unified benchmark endpoint that aggregates scores from multiple benchmark sources (Artificial Analysis, Design Arena, and OpenRouter's own tau-bench, GPQA, and web-search evals). Filter by source to reproduce the exact shapes from the legacy per-source endpoints, or use task_type to find models suited for specific workloads. [...] **Authenticate with any valid OpenRouter API key. Rate-limited to 30 requests/minute per key and 500 requests/day per account.**

Verified live on 2026-08-31: a plain keyless `GET https://openrouter.ai/api/v1/benchmarks` returns

```
401 {"error":{"message":"No cookie auth credentials found","code":401}}
```

while the same keyless call to `/api/v1/models` returns 200. **OpenRouter knows how to require a key for benchmark data, wrote documentation saying so, implemented it, and did not do it for the model list.** That contrast is the single most useful fact in this note about the model list itself. The keyless status of `/api/v1/models` is a choice, made by an organization that demonstrably makes the other choice when it wants to.

### It licenses the data it means to license

`GET /api/v1/datasets/rankings-daily` serves usage rankings, and its description ends:

> Authenticate with any valid OpenRouter API key (same key used for inference). Rate-limited to 30 requests/minute per key and 500 requests/day per account. [...] **Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): reuse and republish with attribution to OpenRouter.**

So OpenRouter grants explicit reuse and republication rights on a dataset when it intends to. It has not done that for the model list. Cuts both ways honestly: it proves OpenRouter does not read section 7 as a blanket ban on third parties consuming its published data, and it proves that where OpenRouter wanted to authorize reuse it wrote the words, and those words are absent from the model list.

### It courts data reuse publicly

[https://openrouter.ai/data](https://openrouter.ai/data), fetched 2026-08-31, is a marketing page titled "OpenRouter Data" whose stated position is:

> Our industry-leading empirical data helps AI companies build and serve great models.

> OpenRouter operates one of the largest AI inference platforms in the world, generating an authoritative empirical dataset relied upon by government agencies, academic researchers, major industry analysts, and global media outlets.

It then lists NIST/CAISI, MIT/Boston University, a16z, Brookings, Reuters, and Cisco as consumers of OpenRouter data, and closes with an invitation: "If you are a researcher, journalist, academic, or institution interested in accessing OpenRouter data for your work, we would love to hear from you." A company that markets external reuse of its data this hard is not one whose section 7 was drafted with `curl https://openrouter.ai/api/v1/models` in mind.

### Third parties do this openly, at scale, for years

- **LiteLLM** (BerriAI, one of the most widely deployed LLM proxies) runs a scheduled GitHub Action, `.github/workflows/auto_update_price_and_context_window.yml`, on `cron: "0 0 * * 0"`, which executes `.github/scripts/auto_update_price_and_context_window_file.py`. That script sets `openrouter_url = "https://openrouter.ai/api/v1/models"`, fetches it keylessly, transforms it, and commits the result into `model_prices_and_context_window.json`, which ships inside the LiteLLM package. Verified via the GitHub API on 2026-08-31. This is automated fetching plus redistribution of OpenRouter's model list, done in public CI by a funded company, on a schedule, with the URL in plain sight.
- **Commercial scrapers are publicly marketed.** Apify hosts at least three paid actors targeting this data, including "OpenRouter Model Scraper", "OpenRouter AI Models Directory Scraper", and "OpenRouter AI Model Pricing Scraper" (search results, 2026-08-31). These are sold openly on a major platform.
- **OpenRouter maintains `OpenRouterTeam/awesome-openrouter`** (457 stars), a curated directory of third-party apps built on OpenRouter, which includes tools whose function is browsing and comparing OpenRouter's models and pricing (for example the "All API Hub" entry: "Manage workspace API keys, browse models and pricing"). OpenRouter promotes an ecosystem of third-party clients that consume its model metadata.

**No evidence of objection was found.** Searching GitHub issues for OpenRouter enforcement, takedown, or terms complaints about model-list consumption returned nothing on 2026-08-31. Absence of evidence is weak evidence here: OpenRouter could object tomorrow, and a search of public issue trackers would not surface a private email. But the affirmative side is not weak: LiteLLM's job has been running in public for a long time and OpenRouter has an interest in LiteLLM's continued existence.

---

## 6. Is a model-selection library a "competing service"?

The clause again, verbatim: "access the Site or Service for purposes of reselling API access to Models or otherwise developing a competing service".

### Steelman for OpenRouter

OpenRouter is not only a router. It operates `openrouter.ai/models` (a browsable catalog with pricing, context, and capability filters), `openrouter.ai/rankings` (usage-based leaderboards), and `openrouter.ai/benchmarks` ("Independent, continuously-run benchmarks of OpenRouter models, providers, and search engines. Browse every leaderboard with live model and run counts.", per the page's own meta description, fetched 2026-08-31). Model discovery and comparison is a product surface OpenRouter has invested in, not an incidental byproduct of routing. A tool that helps a developer decide which model to use, using OpenRouter's own catalog and OpenRouter's own benchmark joins as its input, occupies that surface. And it does so while pointing the resulting decision at direct providers, which routes around the transaction OpenRouter monetizes. The sharpest version: pickai's web app is closer to `openrouter.ai/models` than the pickai library is, and if a competing-service argument ever gets made, the app is where it lands, not the npm package. On the clause text itself, "or otherwise developing a competing service" is a separate disjunct that plainly reaches beyond reselling, or the words add nothing.

### Steelman for pickai

The clause's operative subject is "reselling API access to Models". *Ejusdem generis* pulls "otherwise developing a competing service" toward that: services that stand between a user and model inference and take a cut, which is OpenRouter's actual business, described in section 1 of the terms as "a large language model aggregator where users may use the Site to access third-party APIs to use a variety of generative AI models". pickai sells no access, routes no inference, holds no credits, brokers no provider relationships, takes no margin, and cannot be substituted for OpenRouter by a user who needs to call a model. It is MIT-licensed and free, so there is no revenue to divert. It de-emphasizes pricing by deliberate design, which removes the one axis on which it might undercut OpenRouter's marketplace positioning. And it names OpenRouter among the sellers it points users toward: for a user who picks OpenRouter as their access path, pickai is a funnel into the Service, not away from it. Finally, the conduct in section 5 is the tell. If consuming the model list to help people compare models were the competing-service scenario OpenRouter had in mind, `/api/v1/models` would be behind a key like `/api/v1/benchmarks` is, `awesome-openrouter` would not list catalog browsers, and LiteLLM's weekly job would have drawn a letter.

### The read

The pro-pickai reading is stronger on the clause text and much stronger on conduct. The risk is not that the argument is good; it is that the clause is broad enough to *state* if OpenRouter ever wanted to state it, and OpenRouter's remedy is unilateral and instant. Section 9: "OpenRouter may in its sole discretion terminate your user account on the Service or suspend or terminate your access to the Service at any time for any reason or no reason, with or without notice." Against a keyless caller, the practical form of that remedy is putting the endpoint behind a key, which breaks the adapter and harms nobody's legal position. That is the realistic downside, and it is a maintenance event.

---

## 7. The risk read, graded

Grades are this note's judgment on the evidence above. Not legal advice.

### (a) Using the model list alone: **low**

The strongest single fact: **OpenRouter serves this endpoint keylessly with `Access-Control-Allow-Origin: *` and `cache-control: public` while returning 401 on its own `/api/v1/benchmarks`, so the openness of the model list is a deliberate, differentiated choice by a company that gates what it wants gated.** Add that the documentation instructs keyless `curl` calls against it, offers an RSS feed of it, and describes it as making information "freely available", and that a major OSS project has been redistributing it from public CI on a weekly cron without incident. Section 7's scrape bullet does textually cover it, and that is the residual risk: a broad clause with no carve-out, capable of being invoked at will. But invoking it against documented use of a deliberately public endpoint would contradict OpenRouter's own documentation and its own marketing of data reuse.

### (b) Using the AA-derived benchmark fields: **low-to-moderate**

The strongest single fact: **AA's restrictions run only against a defined "Customer" who registered or contracted with AA, and the Data Platform Terms contain no flow-down clause obliging a Customer to bind downstream recipients, so pickai (never registering, never accepting) is not a party to the promise in section 2.5.** Moderate rather than low for two reasons that are separate from contract. First, the EU/UK database right does not depend on a contract, and AA's evaluation investment is the kind it protects, so a non-US user or distributor sits in a less comfortable position than a US one. Second, AA has stated in a public document that model-selection products are not a use it consents to, which makes an objection plausible even where it might not be enforceable, and complying with such an objection would mean pulling the field. Nothing here suggests the numbers should be republished as an AA dataset: three composites per model, joined to a catalog, rendered with source and date per 9.14, is a much smaller footprint than the redistribution AA's section 2.4 describes. Attribution costs nothing and is worth doing anyway.

### (c) The competing-service theory: **low**

The strongest single fact: **the clause's subject is "reselling API access to Models", and pickai sells no access, routes no inference, takes no margin, and lists OpenRouter itself among the sellers it points users toward, so on the clause's own text pickai is a funnel into the Service rather than a substitute for it.** OpenRouter's continued promotion of third-party catalog-browsing apps in its own `awesome-openrouter` directory is the conduct that confirms it. The residual is that "or otherwise developing a competing service" is broad enough to be asserted, and OpenRouter needs no cause to terminate access.

**Overall.** 9.14's decision holds and, on this evidence, was more cautious than it needed to be. Opt-in and off by default remains right, less because the risk is high than because it is the shape that keeps the choice with the user and costs nothing. What the evidence does change is the framing: 9.11's "silence plus risk, not consent" understated it. The ToS is silent, but the documentation, the OpenAPI spec, the response headers, the RSS feed, and the gating of neighbouring endpoints are not silent. They are a consistent, deliberate publication of this specific endpoint for programmatic consumption. The adapter's user-facing note should say why it is opt-in accurately: not "we are unsure this is allowed", but "these numbers originate with Artificial Analysis, whose terms restrict model-selection uses by their own customers, and OpenRouter's terms grant no explicit reuse right, so the choice to switch this on is yours."

---

## 8. What would change this read

- **A ToS revision.** The July 29 2026 text is what this note reads. Section 11 gives thirty days' notice for material changes and immediate effect for everything else, so re-read the terms before any release that changes how the adapter is used, and diff against the quotes above.
- **The endpoint requiring a key.** If `GET /api/v1/models` starts returning 401, that is OpenRouter answering the question directly. The adapter would then be an account-holder feature, governed by that user's own accepted terms, or it would be removed.
- **A license, terms, or attribution field appearing in the payload.** OpenRouter already does this for `datasets/rankings-daily` ("Licensed under CC BY 4.0: reuse and republish with attribution to OpenRouter"). If the same appears on the model list, comply with it exactly, and the risk in (a) drops to near zero.
- **An AA attribution requirement appearing in the OpenRouter payload or docs.** Today the AA numbers arrive naked. If OpenRouter starts attaching an attribution string or a terms link, that is a condition travelling with the data and it should be honoured verbatim.
- **The `benchmarks.artificial_analysis` field disappearing.** Most likely signal that OpenRouter's own arrangement with AA changed. The adapter should degrade to "no data" rather than to zero, and the disappearance should be logged rather than silently absorbed.
- **Any direct communication from OpenRouter or AA.** A request to stop, from either, ends the analysis. Comply, then decide what to ship instead.
- **pickai becoming a commercial product, or the web app shipping publicly with the OpenRouter adapter live.** Both change the competing-service picture from a free MIT library to something with a customer-facing comparison surface, which is the reading in section 6 that is hardest to defend. Revisit this note at that point rather than assuming it carries over.
- **A change of legal domicile into the EU or UK, for pickai or a significant redistributor.** The database-right exposure in (b) is jurisdiction-sensitive in a way the contract analysis is not.
