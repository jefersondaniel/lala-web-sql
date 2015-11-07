# LalaWebSQL

[![Circle CI](https://circleci.com/gh/jefersondaniel/lala-web-sql/tree/master.svg?style=svg)](https://circleci.com/gh/jefersondaniel/lala-web-sql/tree/master)

Simple interface to WebSQL

## Install

You can get it on bower.

```
bower install lala-web-sql --save
```

## Creating and updating tables

```javascript
var db = new LalaWebSQL({
  name : 'myDatabase'
});

db.createTable('client', {
  id : 'pk',
  name : 'string'
}).then(function () {
  console.log('Table sucessfully created');
});
```

## Updating table

```javascript
db.addColumn('client', {
  document : 'string'
});

db.createIndex('client', 'document', true); // Parameters: table name, field name, is unique
```

## Inserting rows

```javascript
db.insert('client', {
  name : 'Jonh Doe'
});

db.insertOrReplace('client', {
  id : 1,
  name : 'Jonh Doe'
});
```

## Building queries

```javascript
// All results

db.query('client').filter('name', 'Jonh Doe').then(function (rows) {
  console.log(rows);
});

// First result

db.query('client').orderBy('name').first().then(function (row) {
  console.log(row);
});

// Using raw SQL queries

db.query('client').condition('age > ?', [18]).then(function (rows) {
  console.log(rows);
});
```

## Delete rows

```javascript
db.query('client').condition('age > ?', [18]).del();
```

## More examples

[See more examples on unit tests](https://github.com/jefersondaniel/lala-web-sql/blob/master/test/lala-web-sql.spec.js)
