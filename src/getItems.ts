const skinportItemsUrl = process.env.SKINPORT_ITEMS || 'https://api.skinport.com/v1/items';

export async function getItems (tradable: boolean): Promise<any[]>{
  // tradable: If true, it shows only tradable items on the market (default false).
  // т.е., если 1 или true, то покажет только торгуемые предметы
  // если 0 или false, то покажет все предметы
  const params = new URLSearchParams({
    app_id: '730', // Тип `URLSearchParams` требует строки
    currency: 'EUR',
    tradable: tradable ? '1' : '0',
  });

  const response = await fetch(`${skinportItemsUrl}?${params}`, {
    method: 'GET',
    headers: {
      'Accept-Encoding': 'br',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch items: ${response.status}`);
  }

  return await response.json();
}

export async function makeDualPricedArray(){
  const anyItems = await getItems(false);
  const tradableItems = await getItems(true);

  // преобразуем tradableItems в Map для быстрого доступа
  const tradableItemsMap = new Map(
      tradableItems.map(item => [item.market_hash_name, item])
  );

  return anyItems.map(item => {
    const tradableItem = tradableItemsMap.get(item.market_hash_name);

    // ++ поле min_tradable_price
    return {
      ...item,
      min_tradable_price: tradableItem ? tradableItem.min_price : null,
    };
  });
}

const oneRealItem = {
  market_hash_name: "1st Lieutenant Farlow | SWAT",
  currency: "EUR",
  suggested_price: 7.08,
  item_page: "https://skinport.com/item/1st-lieutenant-farlow-swat",
  market_page: "https://skinport.com/market?item=1st%20Lieutenant%20Farlow&cat=Agent&type=SWAT",
  min_price: 6.03,
  min_tradable_price: null, // новое поле
  max_price: 37.01,
  mean_price: 9.75,
  median_price: 9.95,
  quantity: 187,
  created_at: 1607718784,
  updated_at: 1736868297
}