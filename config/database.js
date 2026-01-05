const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

const DB_PRIMARY_URI = process.env.DB_PRIMARY_URI || 'mongodb://localhost:27017/donation_hub';
const DB_SECONDARY_URI = process.env.DB_SECONDARY_URI || 'mongodb://localhost:27017/hospital_db';

let primaryDb;
let secondaryDb;

async function connectPrimaryDB() {
    if (primaryDb) return primaryDb;
    try {
        const client = new MongoClient(DB_PRIMARY_URI);
        await client.connect();
        primaryDb = client.db();
        console.log('Connected to Primary MongoDB');
        return primaryDb;
    } catch (e) {
        console.error('Failed to connect to Primary MongoDB', e);
        process.exit(1);
    }
}

function getPrimaryDB() {
    if (!primaryDb) {
        throw new Error('Primary DB not initialized');
    }
    return primaryDb;
}

async function connectSecondaryDB() {
    if (secondaryDb) return secondaryDb;
    try {
        const connection = await mongoose.connect(DB_SECONDARY_URI);
        secondaryDb = connection;
        console.log('Connected to Secondary MongoDB');
        return secondaryDb;
    } catch (e) {
        console.error('Failed to connect to Secondary MongoDB', e);
        process.exit(1);
    }
}

function getSecondaryDB() {
    if (!secondaryDb) {
        throw new Error('Secondary DB not initialized');
    }
    return secondaryDb;
}

module.exports = { connectPrimaryDB, getPrimaryDB, connectSecondaryDB, getSecondaryDB };
