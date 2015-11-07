(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.LalaWebSQL = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var columnTypeMap = {
  'pk' : 'VARCHAR(255) PRIMARY KEY',
  'string' : 'TEXT',
  'integer' : 'INTEGER(11)',
  'float' : 'DECIMAL(12, 2)',
  'number' : 'DECIMAL(12,2)',
  'boolean' : 'INTEGER(1)',
  'array' : 'TEXT',
  'object' : 'TEXT',
  'date' : 'DATETIME',
};

var cacheById = {};

function columnsToSql(columns) {
  var columnsSpec = [],
    columnValue = null;

  for (var columnName in columns) {
    columnValue = columns[columnName];
    columnsSpec.push('`' + columnName + '` ' + columnTypeMap[columnValue]);
  }

  return columnsSpec;
}

function parseRows(oldRows) {
  var newRows = [];

  for (var i = 0, c = oldRows.length; i < c; i++) {
    newRows.push(_.extend({}, oldRows.item(i)));
  }

  return newRows;
}

var CreateTableCommand = function (options) {
  this.table = options.table;
  this.columns = options.columns;
};

CreateTableCommand.prototype.execute = function (db) {
  var sql = null,
    resolvePromise = null,
    rejectPromise = null,
    promise = new RSVP.Promise(function (resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    }),
    columnSpec = null;

  columnSpec = columnsToSql(this.columns);

  sql = 'CREATE TABLE IF NOT EXISTS ' + this.table + ' (' + columnSpec.join(', ') + ')';

  db.transaction(function (tx) {
    tx.executeSql(sql, [], function (tx, res) {
      resolvePromise(res);
    }, function (tx, err) {
      rejectPromise(err);
    });
  });

  return promise;
};

var CreateIndexCommand = function (options) {
  this.table = options.table;
  this.index =  options.index;
  this.unique = options.unique;
};

CreateIndexCommand.prototype.execute = function (db) {
  var sql = '',
    resolvePromise = null,
    rejectPromise = null,
    promise = new RSVP.Promise(function (resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    }),
    indexName = 'id_' + this.index;

  sql = 'CREATE ' + (this.unique ? ' UNIQUE ' : '') + ' INDEX ' + indexName;
  sql += ' ON ' + this.table + ' (`' + this.index + '` ASC)';

  db.transaction(function (tx) {
    tx.executeSql(sql, [], function (tx, res) {
      resolvePromise(res);
    }, function (tx, err) {
      rejectPromise(err);
    });
  });

  return promise;
};

var AddColumnCommand = function (options) {
  this.table = options.table;
  this.columns = options.columns;
};

AddColumnCommand.prototype.execute = function (db) {
  var sqlList = [],
    resolvePromise = null,
    rejectPromise = null,
    promise = new RSVP.Promise(function (resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    }),
    table = this.table;

  var columnSpec = columnsToSql(this.columns);
  _.each(columnSpec, function (spec) {
    sqlList.push('ALTER TABLE ' + table + ' ADD COLUMN ' + spec);
  });

  db.transaction(function (tx) {
    _.each(sqlList, function (sql) {
      tx.executeSql(sql, [], function (tx, res) {
        resolvePromise(res);
      }, function (tx, err) {
        rejectPromise(err);
      });
    });
  });

  return promise;
};

var AlterColumnCommand = function (options) {
  this.table = options.table;
  this.columns = options.columns;
};

AlterColumnCommand.prototype.execute = function (db) {
  var sqlList = [],
    resolvePromise = null,
    rejectPromise = null,
    promise = new RSVP.Promise(function (resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    }),
    table = this.table;

  var columnSpec = columnsToSql(this.columns);
  _.each(columnSpec, function (spec) {
    sqlList.push('ALTER TABLE ' + table + ' ALTER COLUMN ' + spec);
  });

  db.transaction(function (tx) {
    _.each(sqlList, function (sql) {
      tx.executeSql(sql, [], function (tx, res) {
        resolvePromise(res);
      }, function (tx, err) {
        rejectPromise(err);
      });
    });
  });

  return promise;
};

var SelectCommand = function (options) {
  this.table = options.table;
  this.filters = options.filters;
  this.orderBy = options.orderBy;
  this.offset = options.offset;
  this.limit = options.limit;
  this.condition = options.condition;
  this.params = options.params;
};

SelectCommand.prototype.execute = function (db) {
  var sql = null,
    resolvePromise = null,
    rejectPromise = null,
    promise = new RSVP.Promise(function (resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    }),
    filterSyntax = [],
    sqlParams = [];

  filterSyntax = this.filterSyntax();

  sql = 'SELECT * FROM ' + this.table;

  sql += filterSyntax[0];
  sqlParams = filterSyntax[1];
  db.transaction(function (tx) {
    tx.executeSql(sql, sqlParams, function (tx, res) {
      resolvePromise(parseRows(res.rows));
    }, function (tx, err) {
      rejectPromise(err);
    });
  });

  return promise;
};

SelectCommand.prototype.filterSyntax = function (onlyWhere) {
  var sql = '',
    filtersSql = [],
    sqlParams = [],
    implode = null,
    values = null,
    columnName = null,
    modifier = null;

  if (this.filters || this.condition) {
    for (var filterColumn in this.filters) {
      values = this.filters[filterColumn];
      modifier = filterColumn.split('__')[1];
      columnName = filterColumn.split('__')[0];

      if (_.isArray(values)) {
        implode = [];
        for (var f = 0, fc = values.length; f < fc; f++) {
          implode.push('?');
          if (columnName == 'id' && !isNaN(values[f])) {
            values[f] = (0 + values[f]).toFixed(1);
          }
          sqlParams.push(values[f]);
        }
        implode = implode.join(', ');
        filtersSql.push('`' + columnName + '` IN (' + implode + ')');
      } else {
        if (columnName == 'id' && !isNaN(values)) {
          values = (0 + values).toFixed(1);
        }

        if (modifier === 'regex') {
          filtersSql.push('`' + columnName + '` REGEXP ?');
          sqlParams.push(values);
        } else {
          filtersSql.push('`' + columnName + '` = ?');
          sqlParams.push(values);
        }
      }
    }

    if (this.condition) {
      filtersSql.push(this.condition);
    }

    if (this.params) {
      sqlParams = sqlParams.concat(this.params);
    }

    if (filtersSql.length) {
      sql += ' WHERE ' + filtersSql.join(', ');
    }
  }

  if (!onlyWhere) {
    if (this.orderBy) {
      var orderBy = this.orderBy,
        orderColumn = '',
        direction = 'ASC',
        orderCriterias = [];

      if (!_.isArray(orderBy)) {
        orderBy = [orderBy];
      }

      for (var i = 0, c = orderBy.length; i < c; i++) {
        orderColumn = orderBy[i];

        if (orderColumn.indexOf('-') === 0) {
          orderColumn = orderColumn.substring(1);
          direction = 'DESC';
        }

        orderCriterias.push('`' + orderColumn + '` ' + direction);
      }

      sql += ' ORDER BY ' + orderCriterias.join(', ');
    }

    if (this.limit) {
      sql += ' LIMIT ' + this.limit;
      sql += ' OFFSET ' + this.offset;
    }
  }

  return [sql, sqlParams];
};

var RawQueryCommand = function (options) {
  this.sql = options.sql;
  this.params = options.params || [];
};

RawQueryCommand.prototype.execute = function (db) {
  var sql = this.sql,
    sqlParams = this.params,
    resolvePromise = null,
    rejectPromise = null,
    promise = new RSVP.Promise(function (resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

  db.transaction(function (tx) {
    tx.executeSql(sql, sqlParams, function (tx, res) {
      resolvePromise(parseRows(res.rows));
    }, function (tx, err) {
      rejectPromise(err);
    });
  });

  return promise;
};

var ExecuteCommand = function (options) {
  this.sql = options.sql;
  this.params = options.params || [];
};

ExecuteCommand.prototype.execute = function (db) {
  var sql = this.sql,
    sqlParams = this.params,
    resolvePromise = null,
    rejectPromise = null,
    promise = new RSVP.Promise(function (resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

  db.transaction(function (tx) {
    tx.executeSql(sql, sqlParams, function () {
      resolvePromise(true);
    }, function (tx, err) {
      rejectPromise(err);
    });
  });

  return promise;
};

var InsertCommand = function (options) {
  this.table = options.table;
  this.replace = typeof options.replace == 'undefined' ?
    false :
    options.replace;
  this.rows = options.rows;
};

InsertCommand.prototype.execute = function (db) {
  if (!_.isArray(this.rows)) {
    this.rows = [this.rows];
  }

  this.columns = _.keys(this.rows[0]);

  var sql = '',
    insertPromises = [],
    sqlTemplate = '',
    sqlParams = [],
    allSqlParams = [],
    valuesSql = [],
    rows = this.rows,
    columns = this.columns,
    escapedColumns = _.map(columns, function (txt) {
      return '`' + txt + '`';
    });

  if (this.replace) {
    sql = 'INSERT OR REPLACE INTO ';
  } else {
    sql = 'INSERT INTO ';
  }

  sql += this.table + '(' + escapedColumns.join(', ') + ') VALUES ';
  sqlTemplate = '(' + _.map(this.columns, function () { return '?'; }).join(', ') + ')';
  sql += sqlTemplate;

  _.each(rows, function (row) {
    sqlParams = [];

    valuesSql.push(sqlTemplate);
    _.each(columns, function (column) {
      var currentParam = row[column];

      if (
        currentParam !== null &&
        typeof currentParam !== 'string' &&
        typeof currentParam !== 'number'
      ) {
        if (_.keys(currentParam).length || _.isArray(currentParam)) {
          currentParam = JSON.stringify(currentParam);
        } else if (typeof currentParam == 'object' && isNaN(currentParam)) {
          currentParam = null;
        } else {
          currentParam = 0 + currentParam;
        }
      }

      sqlParams.push(currentParam);
    });

    allSqlParams.push(sqlParams);
  });

  db.transaction(function (tx) {
    _.each(allSqlParams, function (sqlParams) {
      var insertPromise = new RSVP.Promise(function (resolve, reject) {
        tx.executeSql(
          sql,
          sqlParams,
          function () {
            resolve(true);
          },
          function (tx, err) {
            reject(err);
            throw err;
          }
        );
      });

      insertPromises.push(insertPromise);
    });

  });

  return RSVP.all(insertPromises);
};

var Query = function (db, table) {
  this.db = db;
  this.table = table;
  this.resolvePromise = null;
  this.rejectPromise = null;

  this.options = {
    'filters' : {},
    'orderBy' : null,
    'offset' : null,
    'limit' : null
  };

  this.promise = new RSVP.Promise(function (resolve, reject) {
    this.resolvePromise = resolve;
    this.rejectPromise = reject;
  });
};

Query.prototype.then = function (callback) {
  return (new SelectCommand(
    _.extend({'table' : this.table}, this.options)
  ).execute(this.db)).then(callback);
};

Query.prototype.buildCache = function () {
  var _self = this;

  return _self.then(function (res) {
    for (var i = 0, c = res.length; i < c; i++) {
      var row = res[i];

      if (!cacheById[_self.table]) {
        cacheById[_self.table] = {};
      }
      cacheById[_self.table][row.id] = _.extend({}, row);
    }

    return res;
  });
};

Query.prototype.filterSyntax = function (onlyWhere) {
  return (new SelectCommand(
    _.extend({'table' : this.table}, this.options)
  )).filterSyntax(onlyWhere);
};

Query.prototype.filter = function (columnOrObject, value) {
  if (typeof columnOrObject == 'object') {
    for (var column in columnOrObject) {
      this.options.filters[column] = columnOrObject[column];
    }
  } else {
    this.options.filters[columnOrObject] = value;
  }

  return this;
};

Query.prototype.orderBy = function (column) {
  this.options.orderBy = column;
  return this;
};

Query.prototype.condition = function (condition, params) {
  this.options.condition = condition;
  this.options.params = params;
  return this;
};

Query.prototype.limit = function (offset, limit) {
  this.options.offset = offset;
  this.options.limit = limit;
  return this;
};

Query.prototype.all = function () {
  return this;
};

Query.prototype.first = function () {
  return this.limit(0, 1).all().then(function (rows) {
    return rows.length ? rows[0] : null;
  });
};

Query.prototype.del = function () {
  var result = new DeleteCommand({'query' : this}).execute(this.db);
  return result;
};

Query.prototype.count = function () {
  var result = new CountCommand({'query' : this}).execute(this.db);
  return result;
};

var DeleteCommand = function (options) {
  this.query = options.query;
};

DeleteCommand.prototype.execute = function (db) {
  var sql = null,
    resolvePromise = null,
    rejectPromise = null,
    promise = new RSVP.Promise(function (resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    }),
    sqlParams = [],
    filterSyntax = [];

  filterSyntax = this.query.filterSyntax(true);

  sql = 'DELETE FROM ' + this.query.table;
  sql += filterSyntax[0];
  sqlParams = filterSyntax[1];

  db.transaction(function (tx) {
    tx.executeSql(sql, sqlParams, function (tx, res) {
      resolvePromise(res);
    }, function (tx, err) {
      rejectPromise(err);
    });
  });

  return promise;
};

var CountCommand = function (options) {
  this.query = options.query;
};

CountCommand.prototype.execute = function (db) {
  var sql = null,
    resolvePromise = null,
    rejectPromise = null,
    promise = new RSVP.Promise(function (resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    }),
    sqlParams = [],
    filterSyntax = [];

  filterSyntax = this.query.filterSyntax(true);

  sql = 'SELECT COUNT(id) as cnt FROM ' + this.query.table;
  sql += filterSyntax[0];
  sqlParams = filterSyntax[1];

  db.transaction(function (tx) {
    tx.executeSql(sql, sqlParams, function (tx, res) {
      resolvePromise(res.rows.item(0).cnt);
    }, function (tx, err) {
      rejectPromise(err);
    });
  });

  return promise;
};

var LalaWebSQL = function (options) {
  var name = options.name || 'Default';
  var migrations = options.migrations || {};
  var size = options.size || 25 * 1024 * 1024;

  this.db = openDatabase(name, '1.0', name, size);
  this.migrate(migrations);
};

LalaWebSQL.prototype = {
  'getCacheById' : function (table, id) {
    if (!isNaN(id)) {
      id = (0 + id).toFixed(1);
    }

    if (typeof cacheById[table] == 'undefined') {
      cacheById[table] = {};
    }

    return cacheById[table][id];
  },

  'migrate' : function (migrations) {
    if (!migrations) {
      return;
    }

    var _self = this;

    return this.createTable(
      'migration',
      {
        'name' : 'string'
      }
    ).then(function () {
      return _self.query('migration');
    }).then(function (rows) {
      var installedMigrations = _.pluck(rows, 'name'),
        promises = [],
        migratePromise = null,
        migrateFunc = null;

      for (var migrationName in migrations) {
        if (installedMigrations.indexOf(migrationName) != -1) {
          continue;
        }

        migrateFunc = migrations[migrationName];
        migratePromise = migrateFunc(_self);

        if (!migratePromise.then) {
          throw Error('A migração deve retornar uma promise');
        }

        promises.push(migratePromise);
        promises.push(_self.insert('migration', {'name' : migrationName}));
      }

      return RSVP.all(promises);
    });
  },

  'createTable' : function (table, columns) {
    var result = new CreateTableCommand({
      'table' : table,
      'columns' : columns
    }).execute(this.db);

    return result;
  },

  'createIndex' : function (table, index, unique) {
    var result = new CreateIndexCommand({
      'table' : table,
      'index' : index,
      'unique' : unique
    }).execute(this.db);

    return result;
  },

  'addColumn' : function (table, columns) {
    var result = new AddColumnCommand({
      'table' : table,
      'columns' : columns
    }).execute(this.db);

    return result;
  },

  'alterColumn' : function (table, columns) {
    var result = new AlterColumnCommand({
      'table' : table,
      'columns' : columns
    }).execute(this.db);

    return result;
  },

  'insert' : function (table, rows) {
    var result = new InsertCommand({
      'table' : table,
      'rows' : rows,
      'replace' : false
    }).execute(this.db);

    return result;
  },

  'insertOrReplace' : function (table, rows) {
    var result = new InsertCommand({
      'table' : table,
      'rows' : rows,
      'replace' : true
    }).execute(this.db);

    return result;
  },

  'query' : function (table) {
    return new Query(this.db, table);
  },

  'rawQuery' : function (sql, params) {
    var result = new RawQueryCommand({
      'sql' : sql, 'params' : params
    }).execute(this.db);

    return result;
  },

  'sql' : function (sql, params) {
    var cmd = new ExecuteCommand({
      'sql' : sql, 'params' : params
    });

    return cmd.execute(this.db);
  }
};

module.exports = LalaWebSQL;


},{}]},{},[1])(1)
});