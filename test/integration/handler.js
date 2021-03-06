// Load modules

var Lab = require('lab');
var Hapi = require('../..');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('Handler', function () {

    var fetch1 = function (request, reply) {

        reply('Hello').code(444);
        reply();    // Ignored
    };

    var fetch2 = function (request, reply) {

        reply(request.pre.m1 + request.pre.m3 + request.pre.m4);
    };

    var fetch3 = function (request, reply) {

        process.nextTick(function () {

            reply(' ');
        });
    };

    var fetch4 = function (request, reply) {

        reply('World');
    };

    var fetch5 = function (request, reply) {

        reply(request.pre.m2 + '!');
    };

    var fetch6 = function (request, reply) {

        reply(request.server.pack.hapi.error.internal('boom'));
    };

    var fetchException = function (request, reply) {

        a.b.c;
    };

    var getFetch1 = function (request, reply) {

        reply(request.pre.m5);
    };

    var getFetch2 = function (request, reply) {

        reply(request.pre.m1);
    };

    var getFetch4 = function (request, reply) {

        reply(request.responses.m1);
    };

    var server = new Hapi.Server('0.0.0.0', 0, { debug: false });

    server.helper('user', function (id, next) {

        return next({ id: id, name: 'Bob' });
    });

    server.helper('name', function (user, next) {

        return next(user.name);
    });

    server.route([
        {
            method: 'GET',
            path: '/fetch1',
            config: {
                pre: [
                    [
                        { method: fetch1, assign: 'm1' },
                        { method: fetch3, assign: 'm3' },
                        { method: fetch4, assign: 'm4' }
                    ],
                    { method: fetch2, assign: 'm2' },
                    { method: fetch5, assign: 'm5' }
                ],
                handler: getFetch1
            }
        },
        {
            method: 'GET',
            path: '/fetch2',
            config: {
                pre: [
                    { method: fetch1, assign: 'm1' }
                ],
                handler: getFetch2
            }
        },
        {
            method: 'GET',
            path: '/fetch3',
            config: {
                pre: [
                    [{ method: fetch1, assign: 'm1' }],
                    { method: fetch6, assign: 'm6' }
                ],
                handler: getFetch2
            }
        },
        {
            method: 'GET',
            path: '/fetch4',
            config: {
                pre: [
                    { method: fetch1, assign: 'm1' }
                ],
                handler: getFetch4
            }
        },
        {
            method: 'GET',
            path: '/fetchException',
            config: {
                pre: [
                    [{ method: fetch1, assign: 'm1' }],
                    { method: fetchException, assign: 'm6' }
                ],
                handler: getFetch2
            }
        },
        {
            method: 'GET',
            path: '/user/{id}',
            config: {
                pre: [
                    'user(params.id)'
                ],
                handler: function (request, reply) {

                    return reply(request.pre.user);
                }
            }
        },
        {
            method: 'GET',
            path: '/user/{id}/name',
            config: {
                pre: [
                    'user(params.id)',
                    'name(pre.user)'
                ],
                handler: function (request, reply) {

                    return reply(request.pre.name);
                }
            }
        }
    ]);

    it('shows the complete prerequisite pipeline in the response', function (done) {

        server.inject('/fetch1', function (res) {

            expect(res.result).to.equal('Hello World!');
            done();
        });
    });

    it('shows a single prerequisite when only one is used', function (done) {

        server.inject('/fetch2', function (res) {

            expect(res.result).to.equal('Hello');
            done();
        });
    });

    it('returns error if prerequisite returns error', function (done) {

        server.inject('/fetch3', function (res) {

            expect(res.result.code).to.equal(500);
            done();
        });
    });

    it('passes wrapped object', function (done) {

        server.inject('/fetch4', function (res) {

            expect(res.statusCode).to.equal(444);
            done();
        });
    });

    it('returns 500 if prerequisite throws', function (done) {

        server.inject('/fetchException', function (res) {

            expect(res.result.code).to.equal(500);
            done();
        });
    });

    it('returns a user record using helper', function (done) {

        server.inject('/user/5', function (res) {

            expect(res.result).to.deep.equal({ id: '5', name: 'Bob' });
            done();
        });
    });

    it('returns a user name using multiple helpers', function (done) {

        server.inject('/user/5/name', function (res) {

            expect(res.result).to.equal('Bob');
            done();
        });
    });

    it('fails on bad helper name', function (done) {

        var test = function () {

            server.route({
                method: 'GET',
                path: '/x/{id}',
                config: {
                    pre: [
                        'xuser(params.id)'
                    ],
                    handler: function (request, reply) {

                        return reply(request.pre.user);
                    }
                }
            });
        };

        expect(test).to.throw('Unknown server helper method in prerequisite string');
        done();
    });

    it('fails on bad method syntax name', function (done) {

        var test = function () {

            server.route({
                method: 'GET',
                path: '/x/{id}',
                config: {
                    pre: [
                        'userparams.id)'
                    ],
                    handler: function (request, reply) {

                        return reply(request.pre.user);
                    }
                }
            });
        };

        expect(test).to.throw('Invalid prerequisite string method syntax');
        done();
    });
});

