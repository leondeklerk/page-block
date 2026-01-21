<template>
	<main class="max-w-sm w-full">
		<div v-if="loading"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>
		<div v-else>
			<div class="flex flex-col dark:text-gray-200">
				<div class="flex flex-row border-b-2 dark:border-gray-700 p-1">
					<div class="grow">Site</div>
					<div class="basis-1/6 ml-2">Interval</div>
					<div class="basis-1/12 ml-2">Limit</div>
					<div class="basis-1/12 ml-2"></div>
				</div>
				<div
					v-for="url of blockedSites"
					:key="url"
					class="flex flex-row p-1"
				>
					<div class="grow">{{ url }}</div>
					<div class="basis-1/6 ml-2 text-center">{{ intervalListText(url) }}</div>
					<div class="basis-1/12 ml-2 text-center">{{ storedData[url]?.limit }}</div>
					<div
						class="basis-1/12 ml-2 text-[0.6rem] flex items-center justify-center justify-items-center cursor-pointer"
						@click="deleteFromStorage(url)"
					>
						<i class="fa-solid fa-x"></i>
					</div>
				</div>
			</div>
			<div class="border-2 rounded-lg border-gray-600 dark:border-gray-700 mt-4 p-2 dark:text-gray-200">
				<label class="block">
					<span class="">Site</span>
					<input
						v-model="model"
						:disabled="true"
						type="text"
						class="dark:bg-gray-700 text-gray-700 dark:text-gray-400 mt-1 block w-full rounded-md dark:border-gray-700 border-gray-300 shadow-sm"
						placeholder=""
					/>
				</label>
				<label class="block mt-2">
					<span class="">Multiplier</span>
					<input
						v-model="multiplier"
						type="number"
						class="dark:bg-gray-700 input[type='number'] mt-1 block w-full rounded-md dark:border-gray-700 border-gray-300 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
						placeholder=""
						step="1"
					/>
					<p class="text-red-600 text-sm">{{ multiplierValidationError }}</p>
				</label>
				<label class="block mt-2">
					<span class="">Interval</span>
					<select
						v-model="interval"
						class="dark:bg-gray-700 block w-full mt-1 rounded-md dark:border-gray-700 border-gray-300 shadow-sm"
					>
						<option value="h">H - Hour</option>
						<option value="d">D - Day</option>
						<option value="w">W - Week</option>
					</select>
				</label>
				<label class="block mt-2">
					<span class="">Limit</span>
					<input
						v-model="limit"
						type="number"
						class="dark:bg-gray-700 input[type='number'] mt-1 block w-full rounded-md dark:border-gray-700 border-gray-300 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
						placeholder=""
						step="1"
					/>
					<p class="text-red-600 text-sm">{{ limitValidationError }}</p>
				</label>

				<div class="text-center pt-2">{{ outputText }}</div>

				<button
					class="mt-4 transition-all w-full rounded-lg shadow-lg p-2 bg-emerald-500 hover:bg-emerald-600 dark:text-black"
					type="button"
					@click="addBlocked"
				>
					<i class="fa-solid fa-plus"></i>
					Set monitored site
				</button>
			</div>

			<div class="border-2 rounded-lg border-red-600 dark:border-red-500 mt-4 p-2">
				<button
					class="w-full transition-all rounded-lg shadow-lg p-2"
					:class="{
						'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600': allowClear,
						'bg-gray-800 dark:bg-gray-900 text-gray-400  cursor-not-allowed': !allowClear,
					}"
					type="button"
					:disabled="!allowClear"
					@click="clear"
				>
					<i class="fa-solid fa-triangle-exclamation"></i>
					Remove all sites
				</button>
				<div class="p-2 text-yellow-600 flex flex-row items-center justify-center justify-items-center">
					<input
						v-model="allowClear"
						class="rounded"
						type="checkbox"
					/>
					<div class="ml-2">I am aware this action cannot be reversed</div>
				</div>
			</div>
		</div>
	</main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Ref } from "vue";
import { z } from "zod";
import xss from "xss";

const model = defineModel<string>();
const storedData: Ref<Record<string, BlockEntry>> = ref({});
const loading = ref(true);
const allowClear = ref(false);

const interval = ref<"h" | "d" | "w">("h");
const limit = ref(1);
const multiplier = ref(1);

const limitValidationError = ref("");
const multiplierValidationError = ref("");

const blockedSites = computed(() => {
	return Object.keys(storedData.value);
});

type BlockEntry = {
	opened: number;
	limit: number;
	multiplier?: number;
	interval: "h" | "d" | "w";
	lastOpenedOnAt: number | null;
};

listStorage();

onMounted(() => {
	browser.tabs
		.query({ active: true, currentWindow: true })
		.then((tabs) => {
			const currentTab = tabs[0];
			if (currentTab?.url?.startsWith("http")) {
				model.value = new URL(currentTab.url).hostname;
			}
		})

		.catch((err) => console.error(err));
});

watch(limit, () => {
	validate();
});

const outputText = computed(() => {
	if (model.value && limit.value && multiplier.value && interval.value && validate()) {
		const timesText = limit.value > 1 ? "times" : "time";
		const intervalTextSingular = interval.value === "h" ? "hour" : interval.value === "d" ? "day" : "week";
		const intervalTextPlural = interval.value === "h" ? "hours" : interval.value === "d" ? "days" : "weeks";
		const intervalText = multiplier.value > 1 ? intervalTextPlural : intervalTextSingular;
		return `Allow ${model.value} ${limit.value} ${timesText} in ${multiplier.value} ${intervalText}`;
	}
	return "-";
});

function validate() {
	const limitValue = Number(xss(limit.value.toString()));
	limit.value = limitValue;
	const limitResult = z.number({ message: "Please enter a valid number" }).safeParse(limitValue);

	const multiplierValue = Number(xss(multiplier.value.toString()));
	multiplier.value = multiplierValue;
	const multiplierResult = z
		.number({ message: "Please enter a valid number" })
		.min(1, {
			error: "Multiplier must be at least 1",
		})
		.safeParse(multiplierValue);

	let error = false;

	if (!limitResult.success) {
		limitValidationError.value = limitResult.error.format()._errors[0] ?? "";
		error = true;
	}

	if (!multiplierResult.success) {
		multiplierValidationError.value = multiplierResult.error.format()._errors[0] ?? "";
		error = true;
	}
	if (error) {
		return false;
	}

	limitValidationError.value = "";
	multiplierValidationError.value = "";
	return true;
}

async function addBlocked() {
	if (model.value && validate()) {
		await setInStorage(model.value, 1, limit.value, interval.value, multiplier.value);
		await listStorage();
	}
}

async function listStorage() {
	storedData.value = await browser.storage.local.get();

	if (!model.value) {
		loading.value = false;
		return;
	}

	const entry = storedData.value[model.value];

	if (entry) {
		interval.value = entry.interval;
		limit.value = entry.limit;
		multiplier.value = entry.multiplier || 1;
	}

	loading.value = false;
}

async function setInStorage(key: string, opened: number, limit: number, interval: "h" | "d" | "w", multiplier: number) {
	const data: Record<string, BlockEntry> = {};
	data[key] = {
		opened,
		limit,
		interval,
		multiplier,
		lastOpenedOnAt: Date.now(),
	};
	await browser.storage.local.set(data);
}

async function deleteFromStorage(key: string) {
	await browser.storage.local.remove(key);
	await listStorage();
}

async function clear() {
	if (!allowClear.value) {
		return;
	}
	await browser.storage.local.clear();
	await listStorage();
}

function intervalListText(url: string) {
	if (storedData.value[url]) {
		const entry = storedData.value[url];
		return `${entry.multiplier || 1} ${entry.interval}`;
	}
	return "-";
}
</script>
