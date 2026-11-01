import { updateProgress } from './storage';

export const TOOL_PRICES = Object.freeze({ hint:500, undo:450, joker:750, shuffle:500, delete:500 });
function creditCount(progress, tool) {
  if (!Object.prototype.hasOwnProperty.call(TOOL_PRICES, tool)) throw new Error('Unknown tool');
  const count = progress.toolCredits?.[tool] ?? 0;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid tool inventory');
  return count;
}

// Coin and inventory changes share one serialized, durable record.
export async function purchaseToolCredit(tool) {
  let success = false;
  const progress = await updateProgress(current => {
    const count = creditCount(current,tool), price = TOOL_PRICES[tool];
    if (current.coins < price) return {};
    success = true;
    return { coins:current.coins-price, toolCredits:{...current.toolCredits,[tool]:count+1} };
  },{kind:'purchase',source:'booster',toolKey:tool,description:'Yardımcı satın alımı'});
  return { success, progress };
}

export async function grantToolCredit(tool) {
  return updateProgress(current => ({ toolCredits:{...current.toolCredits,[tool]:creditCount(current,tool)+1} }));
}

export async function consumeToolCredit(tool) {
  let success = false;
  const progress = await updateProgress(current => {
    const count = creditCount(current,tool);
    if (count < 1) return {};
    success = true;
    return {toolCredits:{...current.toolCredits,[tool]:count-1}};
  });
  return { success, progress };
}
