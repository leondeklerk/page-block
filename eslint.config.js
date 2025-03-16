import pluginVue from "eslint-plugin-vue";
import prettierConfig from "@vue/eslint-config-prettier";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";

export default defineConfigWithVueTs([
	{
		name: "app/files-to-lint",
		files: ["**/*.{ts,mts,tsx,vue}"],
	},

	{
		name: "app/files-to-ignore",
		ignores: ["**/dist/**", "**/dist-ssr/**", "**/coverage/**"],
	},
	pluginVue.configs["flat/recommended"],
	vueTsConfigs.recommended,
	prettierConfig,
]);
