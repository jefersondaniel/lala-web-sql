var LalaWebSQL = require('../src/lala-web-sql.js');
var fixtures = require('./fixtures.js');
var database = null;

function createTableAndInsert(done, customFixtures) {
  if (!customFixtures) {
    customFixtures = fixtures;
  }

  return database.createTable('client', {
    id : 'pk',
    name : 'string',
    address : 'object',
  }).then(function () {
    var rows = customFixtures;

    return database.insert('client', rows).then(function (tx) {
      expect(tx).not.toBe(null);
      if (done) {
        done();
      }
    }, function () {
      if (done) {
        done();
      }
    });
  });
}

describe('LalaWebSQL', function () {
  beforeEach(function () {
    var dbName = 'db' + (Math.random() * 1000000).toFixed();
    database = new LalaWebSQL({
      name : dbName,
      size : 512 * 1024
    });
  });

  it('Should create indexes', function (done) {
    database.createTable('client', {
      id : 'integer',
      name : 'string',
      'document' : 'string',
    }).then(function () {
      return database.createIndex('client', 'name');
    }).then(function (tx) {
      expect(tx).not.toBe(null);
      return tx;
    }).then(function () {
      return database.createIndex('client', 'document', true);
    }).then(function (tx) {
      expect(tx).not.toBe(null);
      done();
    });
  });

  it('Should create tables', function (done) {
    database.createTable('client', {
      id : 'integer',
      name : 'string',
      address : 'string',
    }).then(function (tx) {
      expect(tx).not.toBe(null);
      done();
    }).catch(function () {
      throw Error('Tabela não criada');
    });
  });

  it('Should alter tables', function (done) {
    database.createTable('client', {
      id : 'integer',
      name : 'string',
    }).then(function () {
      database.addColumn('client', {
        address : 'object',
        'telephone' : 'string',
      });
    }).then(function (tx) {
      expect(tx).not.toBe(null);
      done();
    }).catch(function () {
      done();
      throw Error('Can\'t alter table');
    });
  });

  it('Should insert row', function (done) {
    createTableAndInsert(done, {
      id : 4,
      name : 'lala'
    });
  });

  it('Should cache rows', function (done) {
    createTableAndInsert(null, [
      {id : 1, name : 'lala'},
      {id : 2, name : 'lele'},
      {id : 3, name : 'lili'},
      {id : 4, name : 'lolo'},
    ]).then(function () {
      database
        .query('client')
        .filter('id', [1, 2, 3])
        .buildCache()
        .then(
          function () {
            var lala = database.getCacheById('client', 1),
              lele = database.getCacheById('client', 2),
              lili = database.getCacheById('client', 3),
              lulu = database.getCacheById('client', 4);

            expect(lala).not.toBe(undefined);
            expect(lulu).toBe(undefined);
            expect(lala.name).toBe('lala');
            expect(lele.name).toBe('lele');
            expect(lili.name).toBe('lili');
            done();
          }
        );
    });
  });

  it('Should replace rows', function (done) {
    database.createTable('client', {
      id : 'pk',
      name : 'string',
      address : 'object'
    }).then(function () {
      return database.insert('client', fixtures);
    }).then(function () {
      return database.insertOrReplace(
        'client',
        {
          id : '5435929b4ba5ad43d7e17c57',
          name : 'Alfredo'
        }
      );
    }).then(function () {
      return database.query('client').orderBy('name').first();
    }).then(function (row) {
      expect(row.name).toBe('Alfredo');
      done();
    });
  });

  it(
    'Should query',
    function (done) {
      createTableAndInsert().then(function () {
        database
          .query('client')
          .then(function (rows) {
            expect(rows.length).toBe(fixtures.length);
            expect(JSON.stringify(rows[1])).toBe(JSON.stringify(
              {
                id : '5435929b34fec78e95f918eb',
                name : 'Kline Harris',
                address : '{"city":"brown"}'
              }
            ));
            done();
          });
      });
    }
  );

  it('Should count', function (done) {
    createTableAndInsert(null, [
      {id : 1, name : 'lala'},
      {id : 2, name : 'lele'},
      {id : 3, name : 'lili'},
      {id : 4, name : 'lolo'},
    ]).then(function () {
      database.query('client').count().then(function (count) {
        expect(count).toBe(4);
        return database
          .query('client')
          .filter('id', [1, 2, 3])
          .count();
      }).then(function (count) {
        expect(count).toBe(3);
        done();
      });
    });
  });

  it('Should query using raw SQL', function (done) {
    var sql = 'SELECT DISTINCT SUBSTR(name, 1, 1) as letter FROM client';

    createTableAndInsert(null, [
      {id : 1, name : 'lala'},
      {id : 2, name : 'lele'},
      {id : 3, name : 'lili'},
      {id : 4, name : 'lolo'},
    ]).then(function () {
      database.rawQuery(sql).then(function (rows) {
        expect(rows.length).toBe(1);
        expect(rows[0].letter).toBe('l');
        done();
      });
    });
  });

  it('Should query using raw SQL conditions', function (done) {
    var condition = 'name LIKE ? OR name LIKE ?';

    createTableAndInsert(null, [
      {id : 1, name : 'lala'},
      {id : 2, name : 'lele'},
      {id : 3, name : 'lili'},
      {id : 4, name : 'lolo'},
    ]).then(function () {
      database
        .query('client')
        .condition(condition, ['lili', 'lolo'])
        .then(function (rows) {
          expect(rows.length).toBe(2);
          expect(rows[0].name).toBe('lili');
          expect(rows[1].name).toBe('lolo');
          done();
        });
    });
  });

  it('Should limit queries', function (done) {
    createTableAndInsert().then(function () {
      database.query('client').limit(1, 10).then(function (rows) {
        expect(rows.length).toBe(10);
        expect(JSON.stringify(rows[0])).toBe(JSON.stringify(
          {
            id : '5435929b34fec78e95f918eb',
            name : 'Kline Harris',
            address : '{"city":"brown"}'
          }
        ));
        done();
      });
    });
  });

  it('Should order queries', function (done) {
    createTableAndInsert().then(function () {
      return database.query('client').orderBy('name').first();
    }).then(function (row) {
      expect(row.name).toBe('Alfreda Taylor');
      return database.query('client').orderBy('-name').first();
    }).then(function (row) {
      expect(row.name).toBe('Zurb Stephens');
      done();
    });
  });

  it('Should filter queries', function (done) {
    createTableAndInsert().then(function () {
      database
        .query('client')
        .orderBy('name')
        .filter('name', 'Vincent Gonzalez')
        .first()
        .then(function (row) {
          expect(row.name).toBe('Vincent Gonzalez');
          done();
        });
    });
  });

  it('Should delete using queries', function (done) {
    createTableAndInsert().then(function () {
      return database
        .query('client')
        .filter('name', 'Vincent Gonzalez')
        .del();
    }).then(function () {
      return database.query('client');
    }).then(function (rows) {
      expect(rows.length).toBe(fixtures.length - 1);
      return database.query('client').del();
    }).then(function () {
      return database.query('client');
    }).then(function (rows) {
      expect(rows.length).toBe(0);
      done();
    });
  });

  it('Should run only new migrations', function (done) {
    var productTableCreated = false,
      userTableCreated = false;

    database.migrate({
      'product' : function (database) {
        return database.createTable(
          'product',
          {
            id : 'string',
            name : 'string',
            price : 'number'
          }
        );
      },
    }).then(function () {
      return database.migrate({
        product : function (database) {
          productTableCreated = true;

          return database.createTable(
            'product',
            {
              id : 'string',
              name : 'string',
              price : 'number'
            }
          );
        },
        'user' : function (database) {
          userTableCreated = true;

          return database.createTable(
            'user',
            {
              id : 'string',
              firstName : 'string'
            }
          );
        }
      });
    }).then(function () {
      expect(productTableCreated).toBe(false);
      expect(userTableCreated).toBe(true);
      done();
    });
  });
});

