import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as s3 from 'aws-cdk-lib/aws-s3';
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
    tripsTable.addGlobalSecondaryIndex({
      indexName: 'byRoute',
      partitionKey: { name: 'routeKey', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'departureDateTime', type: dynamodb.AttributeType.STRING },
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
    bookingsTable.addGlobalSecondaryIndex({
      indexName: 'byTrip',
      partitionKey: { name: 'tripId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    const vehiclesTable = new dynamodb.Table(this, 'VehiclesTable', {
      partitionKey: { name: 'vehicleId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    vehiclesTable.addGlobalSecondaryIndex({
      indexName: 'byOwner',
      partitionKey: { name: 'ownerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    const driverVerificationsTable = new dynamodb.Table(this, 'DriverVerificationsTable', {
      partitionKey: { name: 'driverId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    driverVerificationsTable.addGlobalSecondaryIndex({
      indexName: 'byStatus',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
    });

    const driverVerificationUploads = new s3.Bucket(this, 'DriverVerificationUploads', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [{
        allowedMethods: [s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag'],
      }],
    });

    const tripSeatsTable = new dynamodb.Table(this, 'TripSeatsTable', {
      partitionKey: { name: 'tripId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'seatNumber', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const bookingPassengersTable = new dynamodb.Table(this, 'BookingPassengersTable', {
      partitionKey: { name: 'bookingId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'seatNumber', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const paymentsTable = new dynamodb.Table(this, 'PaymentsTable', {
      partitionKey: { name: 'paymentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    paymentsTable.addGlobalSecondaryIndex({
      indexName: 'byBooking',
      partitionKey: { name: 'bookingId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    const travelRequestsTable = new dynamodb.Table(this, 'TravelRequestsTable', {
      partitionKey: { name: 'requestId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    travelRequestsTable.addGlobalSecondaryIndex({
      indexName: 'byPassenger',
      partitionKey: { name: 'passengerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });
    travelRequestsTable.addGlobalSecondaryIndex({
      indexName: 'byRoute',
      partitionKey: { name: 'routeKey', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'preferredDate', type: dynamodb.AttributeType.STRING },
    });

    const reviewsTable = new dynamodb.Table(this, 'ReviewsTable', {
      partitionKey: { name: 'reviewId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    reviewsTable.addGlobalSecondaryIndex({
      indexName: 'byTrip',
      partitionKey: { name: 'tripId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    const notificationsTable = new dynamodb.Table(this, 'NotificationsTable', {
      partitionKey: { name: 'notificationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    notificationsTable.addGlobalSecondaryIndex({
      indexName: 'byRecipient',
      partitionKey: { name: 'recipientId', type: dynamodb.AttributeType.STRING },
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
    });

    // --- Lambda functions ---
    const lambdaDir = path.join(__dirname, '..', 'lambda');
    const commonEnv = {
      TRIPS_TABLE: tripsTable.tableName,
      BOOKINGS_TABLE: bookingsTable.tableName,
      VEHICLES_TABLE: vehiclesTable.tableName,
      DRIVER_VERIFICATIONS_TABLE: driverVerificationsTable.tableName,
      DRIVER_VERIFICATION_UPLOADS_BUCKET: driverVerificationUploads.bucketName,
      TRIP_SEATS_TABLE: tripSeatsTable.tableName,
      BOOKING_PASSENGERS_TABLE: bookingPassengersTable.tableName,
      PAYMENTS_TABLE: paymentsTable.tableName,
      TRAVEL_REQUESTS_TABLE: travelRequestsTable.tableName,
      REVIEWS_TABLE: reviewsTable.tableName,
      NOTIFICATIONS_TABLE: notificationsTable.tableName,
    };

    const makeFn = (name: string, entry: string, operational = false) =>
      new lambdaNode.NodejsFunction(this, name, {
        entry: path.join(lambdaDir, entry),
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: commonEnv,
        timeout: operational ? cdk.Duration.seconds(30) : cdk.Duration.seconds(10),
        memorySize: operational ? 512 : 256,
      });

    const listTripsFn = makeFn('ListTripsFn', 'listTrips.ts');
    const getTripFn = makeFn('GetTripFn', 'getTrip.ts');
    const createTripFn = makeFn('CreateTripFn', 'createTrip.ts');
    const createBookingFn = makeFn('CreateBookingFn', 'createBooking.ts');
    const listBookingsFn = makeFn('ListBookingsFn', 'listBookings.ts');
    const longRoutesFn = makeFn('LongRoutesFn', 'longRoutes.ts', true);

    tripsTable.grantReadData(listTripsFn);
    tripsTable.grantReadData(getTripFn);
    tripsTable.grantReadWriteData(createTripFn);
    driverVerificationsTable.grantReadData(createTripFn);
    tripsTable.grantReadWriteData(createBookingFn);
    bookingsTable.grantReadWriteData(createBookingFn);
    bookingsTable.grantReadData(listBookingsFn);
    tripsTable.grantReadWriteData(longRoutesFn);
    bookingsTable.grantReadWriteData(longRoutesFn);
    vehiclesTable.grantReadWriteData(longRoutesFn);
    driverVerificationsTable.grantReadWriteData(longRoutesFn);
    driverVerificationUploads.grantReadWrite(longRoutesFn);
    tripSeatsTable.grantReadWriteData(longRoutesFn);
    bookingPassengersTable.grantReadWriteData(longRoutesFn);
    paymentsTable.grantReadWriteData(longRoutesFn);
    travelRequestsTable.grantReadWriteData(longRoutesFn);
    reviewsTable.grantReadWriteData(longRoutesFn);
    notificationsTable.grantReadWriteData(longRoutesFn);

    // --- HTTP API ---
    const authorizer = new authorizers.HttpUserPoolAuthorizer('UserPoolAuthorizer', userPool, {
      userPoolClients: [userPoolClient],
    });

    const httpApi = new apigwv2.HttpApi(this, 'TripsHttpApi', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
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

    // Administrative access is assigned out-of-band; it is never exposed as a public sign-up role.
    new cognito.CfnUserPoolGroup(this, 'AdministratorsGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'administrators',
      description: 'RideLink operations administrators',
    });
    new cognito.CfnUserPoolGroup(this, 'VerifiedDriversGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'verified_drivers',
      description: 'Approved long-route transport operators',
    });

    const publicLongRoute = (path: string) =>
      httpApi.addRoutes({
        path,
        methods: [apigwv2.HttpMethod.GET],
        integration: new integrations.HttpLambdaIntegration(`Public${path.replace(/[^a-z0-9]/gi, '')}Integration`, longRoutesFn),
      });
    const protectedLongRoute = (path: string, methods: apigwv2.HttpMethod[]) =>
      httpApi.addRoutes({
        path,
        methods,
        integration: new integrations.HttpLambdaIntegration(`Protected${path.replace(/[^a-z0-9]/gi, '')}${methods.join('')}Integration`, longRoutesFn),
        authorizer,
      });

    publicLongRoute('/long-routes/search');
    publicLongRoute('/long-routes/{tripId}');
    publicLongRoute('/long-routes/{tripId}/seats');
    protectedLongRoute('/long-routes/{tripId}/seats/hold', [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.DELETE]);
    protectedLongRoute('/long-routes/{tripId}/bookings', [apigwv2.HttpMethod.POST]);
    protectedLongRoute('/long-routes/{tripId}/reviews', [apigwv2.HttpMethod.POST]);
    protectedLongRoute('/long-route-bookings', [apigwv2.HttpMethod.GET]);
    protectedLongRoute('/long-route-bookings/{bookingId}', [apigwv2.HttpMethod.GET]);
    protectedLongRoute('/long-route-bookings/{bookingId}/cancel', [apigwv2.HttpMethod.POST]);
    protectedLongRoute('/long-route-bookings/{bookingId}/payment', [apigwv2.HttpMethod.POST]);
    protectedLongRoute('/long-route-bookings/{bookingId}/payment/confirm', [apigwv2.HttpMethod.POST]);
    protectedLongRoute('/long-route-bookings/{bookingId}/check-in', [apigwv2.HttpMethod.POST]);
    protectedLongRoute('/driver/vehicles', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST]);
    protectedLongRoute('/driver/verification', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT]);
    protectedLongRoute('/driver/verification/submit', [apigwv2.HttpMethod.POST]);
    protectedLongRoute('/driver/verification/uploads/presign', [apigwv2.HttpMethod.POST]);
    protectedLongRoute('/driver/long-routes', [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST]);
    protectedLongRoute('/driver/long-routes/{tripId}', [apigwv2.HttpMethod.GET]);
    protectedLongRoute('/driver/long-routes/{tripId}', [apigwv2.HttpMethod.PATCH]);
    protectedLongRoute('/driver/long-routes/{tripId}/seats', [apigwv2.HttpMethod.GET]);
    protectedLongRoute('/driver/long-routes/{tripId}/manifest', [apigwv2.HttpMethod.GET]);
    protectedLongRoute('/travel-requests', [apigwv2.HttpMethod.POST]);
    protectedLongRoute('/notifications', [apigwv2.HttpMethod.GET]);
    protectedLongRoute('/admin/vehicles/{vehicleId}', [apigwv2.HttpMethod.PATCH]);
    protectedLongRoute('/admin/driver-verifications', [apigwv2.HttpMethod.GET]);
    protectedLongRoute('/admin/driver-verifications/{driverId}', [apigwv2.HttpMethod.PATCH]);
    protectedLongRoute('/admin/long-routes/analytics', [apigwv2.HttpMethod.GET]);
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
