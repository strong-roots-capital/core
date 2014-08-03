require('buster').spec.expose();
var expect = require('buster').expect;

var transform = require('../lib/combinators/transform');
var observe = require('../lib/combinators/observe').observe;
var delay = require('../lib/combinators/timed').delay;
var reduce = require('../lib/combinators/reduce').reduce;
var Stream = require('../lib/Stream');

var map = transform.map;
var ap = transform.ap;
var flatMap = transform.flatMap;
var scan = transform.scan;
var tap = transform.tap;

var sentinel = { value: 'sentinel' };
var other = { value: 'other' };

function assertSame(p1, p2) {
	return observe(function(x) {
		return observe(function(y) {
			expect(x).toBe(y);
		}, p2);
	}, p1);
}

describe('map', function() {

	it('should satisfy identity', function() {
		// u.map(function(a) { return a; })) ~= u
		var u = Stream.of(sentinel);
		return assertSame(map(function(x) { return x; }, u), u);
	});

	it('should satisfy composition', function() {
		//u.map(function(x) { return f(g(x)); }) ~= u.map(g).map(f)
		function f(x) { return x + 'f'; }
		function g(x) { return x + 'g'; }

		var u = Stream.of('e');

		return assertSame(
			map(function(x) { return f(g(x)); }, u),
			map(f, map(g, u))
		);
	});

});

describe('tap', function() {

	it('should not transform stream items', function() {
		return tap(function() {
			return other;
		}, Stream.of(sentinel)).observe(function(x) {
			expect(x).toBe(sentinel);
		});
	});

});

describe('flatMap', function() {

	it('should satisfy associativity', function() {
		// m.flatMap(f).flatMap(g) ~= m.flatMap(function(x) { return f(x).flatMap(g); })
		function f(x) { return Stream.of(x + 'f'); }
		function g(x) { return Stream.of(x + 'g'); }

		var m = Stream.of('m');

		return assertSame(
			flatMap(function(x) { return flatMap(g, f(x)); }, m),
			flatMap(g, flatMap(f, m))
		);
	});

	it('should preserve time order', function() {
		var s = flatMap(function(x) {
			return delay(x, Stream.of(x));
		}, Stream.from([20, 10]));

		return reduce(function(a, x) {
			return a.concat(x);
		}, [], s)
			.then(function(a) {
				expect(a).toEqual([10, 20]);
			});
	});
});

describe('ap', function() {

	it('should satisfy identity', function() {
		// P.of(function(a) { return a; }).ap(v) ~= v
		var v = Stream.of(sentinel);
		return assertSame(Stream.of(function(x) { return x; }).ap(v), v);
	});

	it('should satisfy composition', function() {
		//P.of(function(f) { return function(g) { return function(x) { return f(g(x))}; }; }).ap(u).ap(v
		var u = Stream.of(function(x) { return 'u' + x; });
		var v = Stream.of(function(x) { return 'v' + x; });
		var w = Stream.of('w');

		return assertSame(
			Stream.of(function(f) {
				return function(g) {
					return function(x) {
						return f(g(x));
					};
				};
			}).ap(u).ap(v).ap(w),
			u.ap(v.ap(w))
		);
	});

	it('should satisfy homomorphism', function() {
		//P.of(f).ap(P.of(x)) ~= P.of(f(x)) (homomorphism)
		function f(x) { return x + 'f'; }
		var x = 'x';
		return assertSame(Stream.of(f).ap(Stream.of(x)), Stream.of(f(x)));
	});

	it('should satisfy interchange', function() {
		// u.ap(a.of(y)) ~= a.of(function(f) { return f(y); }).ap(u)
		function f(x) { return x + 'f'; }

		var u = Stream.of(f);
		var y = 'y';

		return assertSame(
			u.ap(Stream.of(y)),
			Stream.of(function(f) { return f(y); }).ap(u)
		);
	});

});

describe('scan', function() {
	it('should yield combined values', function() {
		var i = 0;
		var expected = ['a','b','c'];
		return scan(function(arr, x) {
			return arr.concat(x);
		}, [], Stream.from(expected)).observe(function(arr) {
			++i;
			expect(arr).toEqual(expected.slice(0, i));
		});
	});
});
