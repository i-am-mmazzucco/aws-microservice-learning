import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

interface SwnApiGatewayProps {
  productMicroservice: IFunction;
  basketMicroservice: IFunction;
  orderingMicroservice: IFunction;
}

export class SwnApiGateway extends Construct {
  
  constructor(scope: Construct, id: string, props: SwnApiGatewayProps) {
    super(scope, id);

    this.createProductApi(props.productMicroservice);

    this.createBasketApi(props.basketMicroservice);

    this.createOrderApi(props.orderingMicroservice);
  }

  private createProductApi(productMicroservice: IFunction): void {
    const apigw = new LambdaRestApi(this, 'productApi', {
      restApiName: 'Product Service',
      handler: productMicroservice,
      proxy: false
    })

    const product = apigw.root.addResource('product');
    product.addMethod('GET'); // GET /product
    product.addMethod('POST'); // POST /product
    
    const singleProduct = product.addResource('{id}'); // GET /proudct/{id}
    singleProduct.addMethod('GET'); // GET /product/{id}
    singleProduct.addMethod('PUT'); // PUT /product/{id}
    singleProduct.addMethod('DELETE'); // DELETE /product/{id}
  }

  private createBasketApi(basketMicroservice: IFunction) {
    const apigw = new LambdaRestApi(this, 'basketApi', {
      restApiName: 'Basket Service',
      handler: basketMicroservice,
      proxy: false
    })

    const basket = apigw.root.addResource('basket');
    basket.addMethod('GET'); // GET /basket
    basket.addMethod('POST'); // POST /basket

    const singleBasket = basket.addResource('{userName}');
    singleBasket.addMethod('GET'); // GET /basket/{username}
    singleBasket.addMethod('DELETE'); // DELETE /basket/{username}

    const basketCheckout = basket.addResource('checkout');
    basketCheckout.addMethod('POST');
  }

  private createOrderApi(orderingMicroservice: IFunction) {
    const apigw = new LambdaRestApi(this, 'orderApi', {
      restApiName: 'Order Service',
      handler: orderingMicroservice,
      proxy: false
    })

    const order = apigw.root.addResource('order');
    order.addMethod('GET'); // GET /order

    const singleOrder = order.addResource('{userName}');
    singleOrder.addMethod('GET'); // GET /order/{username}

    return singleOrder;
  }
}