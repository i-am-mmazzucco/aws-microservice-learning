import { ScanCommand, GetItemCommand, PutItemCommand, DeleteItemCommand, UpdateItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbClient";
import { ebClient } from "./eventBridgeClient";
import { PutEventsCommand } from "@aws-sdk/client-eventbridge";

exports.handler = async function(event) {
  console.log('request:', JSON.stringify(event, undefined, 2));
  let body;

  try {
    switch (event.httpMethod) {
      case 'GET':
        if (event.pathParameters !== null) {
          body = await getBasket(event.pathParameters.userName); // GET basket/{userName}
        } else {
          body = await getAllBaskets(); // GET baskets
        }
        break;
      case 'POST':
        if (event.path === '/basket/checkout') {
          body = await checkoutBasket(event); // POST /basket/checkout
        } else {
          body = await createBasket(event); // POST /basket
        }
        break;
      case 'DELETE':
        body = await deleteBasket(event.pathParameters.userName); // DELETE /basket/{userName}
        break;
      default:
        throw new Error(`Unsupported route: "${event.httpMethod}"`);
    }

    console.log(body);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body
    }
  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to perform operation.',
        errorMsg: e.message,
        errorStack: e.stack
      })
    }
  }
}

const getBasket = async (userName) => {
  console.log("getBasket");
  try {
      const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: marshall({ userName: userName })
      };
   
      const { Item } = await ddbClient.send(new GetItemCommand(params));
  
      console.log(Item);
      return (Item) ? unmarshall(Item) : {};
  
    } catch(e) {
      console.error(e);
      throw e;
  }
}

const getAllBaskets = async () => {
  console.log("getAllBaskets");
  try {
    const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME
    };

    const { Items } = await ddbClient.send(new ScanCommand(params));

    console.log(Items);
    return (Items) ? Items.map((item) => unmarshall(item)) : {};

  } catch(e) {
      console.error(e);
      throw e;
  }
}

const createBasket = async (event) => {
  console.log(`createBasket function. event : "${event}"`);
  try {
    const requestBody = JSON.parse(event.body);
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(requestBody || {})
    };  

    const createResult = await ddbClient.send(new PutItemCommand(params));
    console.log(createResult);
    return createResult;

  } catch(e) {
    console.error(e);
    throw e;
  }
}

const deleteBasket = async (userName) => {
  console.log(`deleteBasket function. userName : "${userName}"`);
  try {    
    const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: marshall({ userName: userName }),
    };   

    const deleteResult = await ddbClient.send(new DeleteItemCommand(params));
    console.log(deleteResult);
    return deleteResult;

  } catch(e) {
    console.error(e);
    throw e;
  }   
}

const checkoutBasket = async (event) => {
  const checkoutRequest = JSON.parse(event.body);
  if (!checkoutRequest.userName) {
    throw new Error(`userName should exist in checkoutRequest: "${checkoutRequest}"`)
  }

  const basket = await getBasket(checkoutRequest.userName);

  const checkoutPayload = prepareOrderPayload(checkoutRequest, basket);

  const publishedEvent = await publishCheckoutBasketEvent(checkoutPayload);

  await deleteBasket(checkoutRequest.userName);
}

const prepareOrderPayload = (checkoutRequest, basket) => {
  try {
    if (!basket?.items?.length) {
      throw new Error(`basket should exist in items: "${basket}"`);
    }

    const totalPrice = basket.items.reduce((acc, item) => {
      return acc + item.price;
    }, 0)

    const newCheckoutRequest = {
      ...checkoutRequest,
      totalPrice
    }

    Object.assign(newCheckoutRequest, basket);

    return checkoutRequest;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

const publishCheckoutBasketEvent = async (checkoutPayload) => {
  try {
    const params = {
      Entries: [
        {
          Source: process.env.EVENT_SOURCE,
          Detail: JSON.stringify(checkoutPayload),
          DetailType: process.env.EVENT_DETAILTYPE,
          Resources: [],
          EventBusName: process.env.EVENT_BUSNAME
        }
      ]
    }
    const data = await ebClient.send(new PutEventsCommand(params));

    return data;
  } catch (e) {
    console.error(e);
    throw e;
  }
}
