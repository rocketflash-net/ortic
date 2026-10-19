import fs from "fs"
import path from "path"

const featureName = process.argv[2]

if (!featureName) {
  console.error("❌ Please provide a feature name. Example: npm run create-feature feature-a")
  process.exit(1)
}

// PascalCase: my-testing -> MyTesting
const pascalCase = featureName
  .split("-")
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  .join("")

// camelCase: my-testing -> myTesting
const camelCase = featureName
  .split("-")
  .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
  .join("")

const baseDir = path.resolve("src/features", featureName)
const routerFilePath = path.resolve("src/router/index.ts")

if (fs.existsSync(baseDir)) {
  console.error(`⚠️ Feature "${featureName}" already exists.`)
  process.exit(1)
}

// ==== TEMPLATES =====
const templates = {
  component: `<script setup lang="ts"></script>
<template>
  <div>
    <h1 class="text-2xl font-bold">${pascalCase}</h1>
  </div>
</template>
`,

  language: `export default {
  feature_title: 'This is ${pascalCase}',
}
`,

  model: `export enum ${pascalCase}PageName {
  ${pascalCase.toUpperCase()} = '${pascalCase}',
}

export type ${pascalCase}RequestPayload = {
  name: string
}
`,

  route: `import type { RouteRecordRaw } from 'vue-router'
import { ${pascalCase}PageName } from '../models'

const ${camelCase}Routes: RouteRecordRaw[] = [
  {
    path: '/${featureName}',
    name: ${pascalCase}PageName.${pascalCase.toUpperCase()},
    component: () => import('@/features/${featureName}/views/${pascalCase}View.vue'),
  },
]

export default ${camelCase}Routes
`,

  service: `import axiosInstance from '@/plugins/axios'
import type { ApiResponse, CustomAxiosRequestConfig } from '@/shared/models/api'
import type { ${pascalCase}RequestPayload } from '../models'

export const ${pascalCase}Request = async (payload: ${pascalCase}RequestPayload): Promise<ApiResponse> => {
  const configRequest: CustomAxiosRequestConfig<${pascalCase}RequestPayload> = {
    url: '/${featureName}/request',
    method: 'POST',
    data: payload,
    meta: {
      requiresAuth: true,
    },
  }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
`,

  view: `<script setup lang="ts">
import ${pascalCase}Component from '../components/${pascalCase}Component.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 px-6">
    <${pascalCase}Component></${pascalCase}Component>
  </div>
</template>
`,
}

// Struktur folder & file
const structure = {
  components: { [`${pascalCase}Component.vue`]: templates.component },
  languages: {
    [`${featureName}.en.ts`]: templates.language,
    [`${featureName}.id.ts`]: templates.language,
  },
  models: { "index.ts": templates.model },
  routes: { "index.ts": templates.route },
  services: { "api.ts": templates.service },
  stores: {},
  views: { [`${pascalCase}View.vue`]: templates.view },
}

// ==== BUAT FOLDER & FILE FEATURE ====
fs.mkdirSync(baseDir, { recursive: true })
Object.entries(structure).forEach(([folder, files]) => {
  const folderPath = path.join(baseDir, folder)
  fs.mkdirSync(folderPath, { recursive: true })
  Object.entries(files).forEach(([filename, content]) => {
    fs.writeFileSync(path.join(folderPath, filename), content)
  })
})

console.log(`✅ Feature "${featureName}" created successfully at src/features/${featureName}`)

// ==== UPDATE LOCALES (id & en) ====
// Contoh target file:
// src/plugins/language/locales/id.ts
// src/plugins/language/locales/en.ts
//
// import example from "@/features/example/languages/example.id"
// import utils from "@/shared/languages/utils.id"
//
// export default {
//   features: {
//     example,
//   },
//   utils,
// }

const localeConfigs = [
  { locale: "id", langExt: "id" },
  { locale: "en", langExt: "en" },
]

function updateLocaleFile({ locale, langExt }) {
  const localeFilePath = path.resolve(`src/plugins/language/locales/${locale}.ts`)

  if (!fs.existsSync(localeFilePath)) {
    console.warn(`⚠️ File src/plugins/language/locales/${locale}.ts tidak ditemukan, skip.`)
    return
  }

  let localeContent = fs.readFileSync(localeFilePath, "utf-8")

  const importStatement = `import ${camelCase} from "@/features/${featureName}/languages/${featureName}.${langExt}"`

  // 1) Tambah import kalau belum ada
  if (!localeContent.includes(importStatement)) {
    const importLines = localeContent.match(/^import.*$/gm) || []
    const lastImport = importLines[importLines.length - 1]

    if (lastImport) {
      localeContent = localeContent.replace(lastImport, `${lastImport}\n${importStatement}`)
    } else {
      localeContent = `${importStatement}\n${localeContent}`
    }
  }

  // 2) Tambah ke objek features
  const featuresRegex = /features:\s*{([\s\S]*?)}/m
  const featuresMatch = localeContent.match(featuresRegex)

  if (featuresMatch) {
    const featuresContent = featuresMatch[1]

    if (!featuresContent.includes(camelCase)) {
      const newFeaturesContent = `${featuresContent}\n    ${camelCase},`
      const replacement = `features: {${newFeaturesContent}\n  }`
      localeContent = localeContent.replace(featuresRegex, replacement)
    }
  } else {
    console.warn(
      `⚠️ Object 'features' tidak ditemukan di src/plugins/language/locales/${locale}.ts`,
    )
  }

  fs.writeFileSync(localeFilePath, localeContent, "utf-8")
  console.log(`✅ Added ${camelCase} language to src/plugins/language/locales/${locale}.ts`)
}

localeConfigs.forEach(updateLocaleFile)

// ==== UPDATE ROUTER ====
if (fs.existsSync(routerFilePath)) {
  let routerContent = fs.readFileSync(routerFilePath, "utf-8")

  const importStatement = `import ${camelCase}Routes from '@/features/${featureName}/routes'`
  const spreadStatement = `...${camelCase}Routes`

  // Tambahkan import kalau belum ada
  if (!routerContent.includes(importStatement)) {
    const importLines = routerContent.match(/^import.*$/gm) || []
    const lastImport = importLines[importLines.length - 1]

    if (lastImport) {
      routerContent = routerContent.replace(lastImport, `${lastImport}\n${importStatement}`)
    } else {
      routerContent = `${importStatement}\n${routerContent}`
    }
  }

  // Tambahkan ke listRoutes
  const listRoutesMatch = routerContent.match(/const\s+listRoutes\s*=\s*\[(.*?)\]/s)
  if (listRoutesMatch) {
    const listContent = listRoutesMatch[1].trim()
    const alreadyExists = listContent.includes(spreadStatement)

    if (!alreadyExists) {
      const newListContent = listContent.endsWith(",")
        ? `${listContent}\n  ${spreadStatement},`
        : `${listContent}${listContent ? "," : ""}\n  ${spreadStatement},`

      routerContent = routerContent.replace(
        listRoutesMatch[0],
        `const listRoutes = [${newListContent}\n]`,
      )
    }
  } else {
    console.warn("⚠️ Could not find 'listRoutes' array in router/index.ts")
  }

  fs.writeFileSync(routerFilePath, routerContent, "utf-8")
  console.log(`✅ Added ${camelCase}Routes to router/index.ts`)
} else {
  console.warn("⚠️ router/index.ts not found, skipping route registration.")
}
