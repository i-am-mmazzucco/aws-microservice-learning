import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SwnDatabase } from './database';
import { SwnMicroservices } from './microservice';
import { SwnApiGateway } from './apigateway';

// Open source https://github.com/aws/aws-cdk/tree/v1-main/packages/@aws-cdk

export class AwsMicroservicesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const database = new SwnDatabase(this, 'Database');

    const microservices = new SwnMicroservices(this, 'Microservices', { productTable: database.productTable, basketTable: database.basketTable })

    const apigateway = new SwnApiGateway(this, 'ApiGateway', { productMicroservice: microservices.productMicroservice, basketMicroservice: microservices.basketMicroservice });
  }
}
