import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as path from 'path';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- DynamoDB tables ---
    const tripsTable = new dynamodb.Table(this, 'TripsTable', {
      partitionKey: { name: 'tripId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const bookingsTable = new dynamodb.Table(this, 'BookingsTable', {
      partitionKey: { name: 'bookingId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    bookingsTable.addGlobalSecondaryIndex({
      indexName: 'byRider',
      partitionKey: { name: 'riderId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // --- Cognito user pool (auth for drivers/riders) ---
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        givenName: { required: false, mutable: true },
        familyName: { required: false, mutable: true },
        phoneNumber: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
    });

    const userPoolClient = userPool.addClient('WebClient', {
      authFlows: { userPassword: true, userSrp: true },
      writeAttributes: new cognito.ClientAttributes().withStandardAttributes({
        email: true,
        givenName: true,
        familyName: true,
        phoneNumber: true,
      }),
    });

    // --- Lambda functions ---
    const lambdaDir = path.join(__dirname, '..', 'lambda');
    const commonEnv = {
      TRIPS_TABLE: tripsTable.tableName,
      BOOKINGS_TABLE: bookingsTable.tableName,
    };

    const makeFn = (name: string, entry: string) =>
      new lambdaNode.NodejsFunction(this, name, {
        entry: path.join(lambdaDir, entry),
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: commonEnv,
      });

    const listTripsFn = makeFn('ListTripsFn', 'listTrips.ts');
    const getTripFn = makeFn('GetTripFn', 'getTrip.ts');
    const createTripFn = makeFn('CreateTripFn', 'createTrip.ts');
    const createBookingFn = makeFn('CreateBookingFn', 'createBooking.ts');
    const listBookingsFn = makeFn('ListBookingsFn', 'listBookings.ts');

    tripsTable.grantReadData(listTripsFn);
    tripsTable.grantReadData(getTripFn);
    tripsTable.grantReadWriteData(createTripFn);
    tripsTable.grantReadWriteData(createBookingFn);
    bookingsTable.grantReadWriteData(createBookingFn);
    bookingsTable.grantReadData(listBookingsFn);

    // --- HTTP API ---
    const authorizer = new authorizers.HttpUserPoolAuthorizer('UserPoolAuthorizer', userPool, {
      userPoolClients: [userPoolClient],
    });

    const httpApi = new apigwv2.HttpApi(this, 'TripsHttpApi', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Public: browse trips
    httpApi.addRoutes({
      path: '/trips',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('ListTripsIntegration', listTripsFn),
    });
    httpApi.addRoutes({
      path: '/trips/{tripId}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetTripIntegration', getTripFn),
    });

    // Authenticated: post a trip / book a seat / view my bookings
    httpApi.addRoutes({
      path: '/trips',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('CreateTripIntegration', createTripFn),
      authorizer,
    });
    httpApi.addRoutes({
      path: '/bookings',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('CreateBookingIntegration', createBookingFn),
      authorizer,
    });
    httpApi.addRoutes({
      path: '/bookings',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('ListBookingsIntegration', listBookingsFn),
      authorizer,
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
  }
}
