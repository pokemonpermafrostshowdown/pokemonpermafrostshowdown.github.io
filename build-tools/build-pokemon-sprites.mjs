#!/usr/bin/env node
/* eslint-disable @stylistic/arrow-parens */

import pokedexModule from "../caches/pokemon-showdown/dist/data/pokedex.js";
import dexDataModule from "../caches/pokemon-showdown/dist/sim/dex-data.js";
import { createCanvas } from "canvas";
import fs from "node:fs";
import fsPromises from "node:fs/promises";

const { Pokedex } = pokedexModule;

const WIDTH = 64;
const HEIGHT = 64;

const OUT_DIR_NAMES = ["home", "home-centered", "gen5", "gen5-back"];

const TYPE_COLORS = {
	Normal: "rgb(168, 168, 120)",
	Fire: "rgb(240, 128, 48)",
	Fighting: "rgb(192, 48, 40)",
	Water: "rgb(104, 144, 240)",
	Flying: "rgb(168, 144, 240)",
	Grass: "rgb(120, 200, 80)",
	Poison: "rgb(160, 64, 160)",
	Electric: "rgb(248, 208, 48)",
	Ground: "rgb(224, 192, 104)",
	Psychic: "rgb(248, 88, 136)",
	Rock: "rgb(184, 160, 56)",
	Ice: "rgb(152, 216, 216)",
	Bug: "rgb(168, 184, 32)",
	Dragon: "rgb(112, 56, 248)",
	Ghost: "rgb(112, 88, 152)",
	Dark: "rgb(112, 88, 72)",
	Steel: "rgb(184, 184, 208)",
	Fairy: "rgb(238, 153, 172)",
};

async function buildPlaceholderSprites() {
	/** @type {Promise<void>[]} */
	const promises = [];

	for (const monId in Pokedex) {
		const mon = Pokedex[monId];
		const baseId = mon.baseSpecies ? dexDataModule.toID(mon.baseSpecies) : monId;
		const formeId = mon.forme ? dexDataModule.toID(mon.forme) : undefined;
		const fileId = `${baseId}${formeId ? `-${formeId}` : ""}`;

		const path = `play.pokemonshowdown.com/sprites/pokemon-temp/${fileId}.png`;
		const backPath = `play.pokemonshowdown.com/sprites/pokemon-temp-back/${fileId}.png`;

		promises.push(buildPlaceholderSprite(mon, path));
		promises.push(buildPlaceholderSprite(mon, backPath, true));
	}

	await Promise.all(promises);
}

async function buildPlaceholderSprite(mon, path, back = false) {
	if (await fsPromises.stat(path).catch(() => false)) {
		return;
	}

	console.log("Generating", mon.name);

	const canvas = createCanvas(WIDTH, HEIGHT);
	const ctx = canvas.getContext("2d");

	if (back) {
		ctx.translate(WIDTH, 0);
		ctx.scale(-1, 1);
	}

	ctx.font = "14px Arial";
	ctx.fillStyle = TYPE_COLORS[mon.types[0]];
	fillCenteredWrappedText(
		ctx,
		mon.name,
		WIDTH / 2,
		HEIGHT / 2,
		WIDTH * 0.8,
		14 * 1.5
	);

	return await new Promise((ok) => {
		const out = fs.createWriteStream(path);
		const png = canvas.createPNGStream();
		png.pipe(out);
		out.on("finish", ok);
	});
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 * @param {number} lineHeight
 */
function fillCenteredWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
	const words = text.split(/[ -]/);
	/** @type {string[]} */
	const lines = [];
	let currentLine = "";

	for (let i = 0; i < words.length; i++) {
		const testLine = currentLine + words[i] + " ";
		const metrics = ctx.measureText(testLine);

		if (metrics.width > maxWidth && i > 0) {
			lines.push(currentLine.trim());
			currentLine = words[i] + " ";
		} else {
			currentLine = testLine;
		}
	}

	lines.push(currentLine.trim());

	const totalHeight = lines.length * lineHeight;

	ctx.textAlign = "center";
	ctx.textBaseline = "top";

	const startY = y - totalHeight / 2;

	for (let i = 0; i < lines.length; i++) {
		ctx.fillText(lines[i], x, startY + i * lineHeight);
	}
}

async function copySpriteDirs() {
	for (const dirName of OUT_DIR_NAMES) {
		const srcDir = `play.pokemonshowdown.com/sprites/pokemon-temp${
			dirName.includes("-back") ? "-back" : ""
		}`;
		const destDir = `play.pokemonshowdown.com/sprites/${dirName}`;

		await fsPromises.cp(srcDir, destDir, { recursive: true });
	}
}

async function main() {
	for (const outDirName of OUT_DIR_NAMES) {
		await fsPromises.rm(`play.pokemonshowdown.com/sprites/${outDirName}`, { recursive: true });
	}

	const srcDir = "play.pokemonshowdown.com/sprites/pokemon";
	const srcAndTempDir = "play.pokemonshowdown.com/sprites/pokemon-temp";

	const srcBackDir = "play.pokemonshowdown.com/sprites/pokemon-back";
	const srcAndTempBackDir = "play.pokemonshowdown.com/sprites/pokemon-temp-back";

	await Promise.all([
		fsPromises.cp(srcDir, srcAndTempDir, { recursive: true }),
		fsPromises.cp(srcBackDir, srcAndTempBackDir, { recursive: true }),
	]);

	await buildPlaceholderSprites();
	await copySpriteDirs();

	await Promise.all([
		fsPromises.rm(srcAndTempDir, { recursive: true }),
		fsPromises.rm(srcAndTempBackDir, { recursive: true }),
	]);
}

await main();
