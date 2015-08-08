'use strict';

/**
* @fileOverview
* @author Guido Donnari (gdonnari@yahoo.com.ar)
* @version 0.2
*/

/**
* The Flexy-List angular module.
* @module
*/
var flexiList = angular.module('flexiList', []);

/**
 * @ngdoc service
 * @name flexiListService
 * @private
 * @description 
 *   Provides functions to sort, filter and limit a JSON dataset.
 */
flexiList.factory('flexiListService', ['$log', '$filter', function($log, $filter) {
	
	return {
		
		sortDataset: function(dataset, orderby)
		{
			var sorted_ds = [];
			
			// Sort
			// TODO: nested sorts
			if (orderby[0])
			{
				var reverse = (orderby[0].type == 'desc');
				sorted_ds = $filter('orderBy')(dataset, orderby[0].field, reverse);
			}
			else
			{
				sorted_ds = dataset;
			}
			
			return sorted_ds;
		},
		
		// Filter the dataset
		filterDataset: function(dataset, where)
		{
			var filtered_ds = [];
			var field;
			var value;
			var condition;
			var pattern;
			var option;
			var passed;
			
			// Where
			if (where.length)
			{
				for (var i=0; i < dataset.length; i++)
				{
					passed = true;
					
					for (var j=0; j < where.length; j++)
					{
						field = where[j].field;
						value = dataset[i][field];
						condition = where[j].condition;
						pattern = where[j].value;
						option = where[j].option;
						
						try {
							passed = $filter(condition)(value, pattern, option);
						} catch (e){
							$log.log(options.logid + ' - flexiListService: filter exception at ', e);
							passed = true;
						}
						
						//$log.log(options.logid + ' - filterDataset: value=' + value + ' condition=' + condition + ' pattern=' + pattern + ' passed=' + passed);
						if (! passed) break;
					}
					
					if (passed) 
						filtered_ds.push(dataset[i]);
				}
			}
			else
			{
				filtered_ds = dataset;
			}
			
			return filtered_ds;
		},
		
		limitDataset: function(dataset, limit)
		{
			if (! limit) return dataset;
			
			var limited_ds = [];
			var lastrec = limit;
			
			if (lastrec > dataset.length)	lastrec = dataset.length;
			
			for (var i=0; i < lastrec; i++)
				limited_ds.push(dataset[i]);
			
			return limited_ds;
		},
		
		processDataset: function(dataset, where, orderby, limit)
		{
			var filtered_ds = this.filterDataset(dataset, where);
			var ordered_ds = this.sortDataset(filtered_ds, orderby);
			var limited_ds = this.limitDataset(ordered_ds, limit);
			return limited_ds;
		},
		
		pageDataset: function(dataset, offset, pagesize)
		{
			var page_ds = [];
			var lastrec = offset + pagesize;
			
			if (lastrec > dataset.length)	lastrec = dataset.length;
			
			for (var i=offset; i < lastrec; i++)
				page_ds.push(dataset[i]);
			
			return page_ds;
		},
		
		getPagination: function(rowcount, offset, pagesize, show_pages)
		{
			var pagination = {};
			var currpage = (offset / pagesize) + 1;
			var maxpage = Math.ceil(rowcount / pagesize);
			var firstpage = currpage - 2;
			
			if (firstpage < 1) firstpage = 1;
			var lastpage = firstpage + show_pages - 1;
			
			var overflow = lastpage - maxpage;
			
			if (overflow > 0) 
			{
				lastpage = maxpage;
				firstpage = firstpage - overflow;
				if (firstpage < 1) firstpage = 1;
			}
			
			var firstrec = ((currpage - 1) * pagesize) + 1;
			var lastrec = currpage * pagesize;
			
			if ( lastrec > rowcount)	lastrec = rowcount;
			
			var pages = [];
			
			for (var i=firstpage; i <= lastpage; i++)
				pages.push(i);
			
			pagination.firstrec = firstrec;
			pagination.lastrec = lastrec;
			pagination.rowcount = rowcount;
			pagination.currpage = currpage;
			pagination.lastpage = lastpage;
			pagination.pages = pages;
			pagination.totalpages = maxpage;
			pagination.show_pages = show_pages;
			pagination.pagesize = pagesize;
			
			return pagination;
		}
		
	};
	
}]);

/**
 * @ngdoc controller
 * @name flMainCtrl
 * @description 
 * Exposes the API to the templates.
 */
flexiList.controller('flMainCtrl', ['$scope', '$log', '$q', '$http', 'flexiListService', 
function($scope, $log, $q, $http, flexiListService) {
	
	var options = {
		data: false,
		jsonFile: false,
		listURL: false,
		autoLoad: true,
		selectable: true,
		multiselect: true,
		limit: false,
		where: [],
		sortable: true,
		orderby: [],
		pagination: true,
		paginationOnClient: false,
		pagesize: 10,
		pages: 5,
		method: 'GET',
		urlencoded: true,
		onRecordsLoaded: false,
		onLoadError: false,
		overlayToggle: false,
		logid: 'FL'
	};
	
	var dataLoaded = false;
	var ds_length;
	var records = [];
	var offset = 0;
	
	init();
	
	function init()
	{
		if (!$scope.list)
		{
			$log.log(options.logid + ' - undefined scope.');
			return;
		}
		
		angular.extend(options, $scope.list.options);
		
		/** Event listener to trigger data loading
		* @public
		* @param p_options options.
		*/  
		$scope.$on('loadData', function(event, p_options) {
			/*
			// TODO: nested sorts
			if (p_options.orderby_append)
				addOrderby(p_options.orderby);
			*/
			angular.extend(options, p_options);
			loadData();
		});
		
		/** Returns the select enabled status
		* @public
		*/  
		$scope.list.selectEnabled = function () {
			return options.selectable;
		};
		
		/** Returns the pagination enabled status
		* @public
		*/  
		$scope.list.paginationEnabled = function () {
			
			if (! options.pagination)	return false;
			
			if (records.length > 0) return true;
			
			return false;
		};
		
		/** Returns the sort enabled status
		* @public
		*/  
		$scope.list.sortEnabled = function (col) {
			if (! options.sortable)	return false;
			if (! col)	return options.sortable;
			if (col.sortable == false)	return false;
			return true;
		};
		
		/** Returns the records array
		* @public
		*/  
		$scope.list.getRecords = function () {
			return records;
		};
		
		/** Checks whenever data was loaded
		* @public
		*/  
		$scope.list.noResults = function () {
			return (records.length == 0 && dataLoaded);
		};
		
		/** Checks whenever the loaded dataset has no records
		* @public
		*/  
		$scope.list.notEmpty = function () {
			if (records.length > 0) return true;
			return false;
		};
		
		if (options.sortable) makeScopeSortable();
		if (options.pagination) makeScopePagination();
		if (options.selectable) makeScopeSelectable();
		if (options.autoLoad) loadData();
	}
	
	//************************************************************
	// Sortable
	//************************************************************
	var sorted = {};
	
	function makeScopeSortable()
	{
		sorted = transformSorted();
		
		/** Checks whenever the list is sorted "asc" by a given field
		* @public
		*/  
		$scope.list.isSortedAsc = function(field)
		{
			if (! sorted)	return false;
			return (sorted[field] == 'asc');
		};
		
		/** Checks whenever the list is sorted "desc" by a given field
		* @public
		*/  
		$scope.list.isSortedDesc = function(field)
		{
			if (! sorted)	return false;
			return (sorted[field] == 'desc');
		};
	}
	
	function setOrderby(orderby)
	{
		options.orderby = orderby;
		sorted = transformSorted();
	}
	
	function addOrderby(orderby)
	{
		var replaced = false;
		
		for (var i=0; i < options.orderby.length; i++)
		{
			if (options.orderby[i].field == orderby.field)
			{
				options.orderby[i].type = orderby.type;
				replaced = true;
				break;
			}
		}
		
		if (! replaced)
			options.orderby.push({
				field: orderby.field, 
				type: orderby.type
			});
		
		sorted = transformSorted();
	}
	
	function transformSorted()
	{
		if (! options.orderby) return;
		
		var arr = {};
		
		for (var i=0; i < options.orderby.length; i++)
			arr[options.orderby[i].field] = options.orderby[i].type;
		
		return arr;
	}
	
	//************************************************************
	// Row Selection
	//************************************************************
	var selectedRow = false;
	var selectedCount = 0;
	var allSelected = false;
	
	function makeScopeSelectable()
	{
		/** Checks whenever a given record was selected
		* @public
		*/  
		$scope.list.isRowSelected = function (record) {
			if (! record.flSelected )	return false;
			return true;
		};
		
		/** Toggles row selection
		* @public
		*/  
		$scope.list.rowToggleSelect = function (record) {
			
			if (record.readonly)	return;
			
			if (record.flSelected)
				rowUnselect(record);
			else
				rowSelect(record);
		};
		
		if (options.multiselect)
		{
			/** Enables selection of multiple rows
			* @public
			*/		
			$scope.list.selectAll = function () {
			
				if (! records)	return;
				
				// Reverse selected state
				allSelected = (! allSelected);
				selectedCount = 0;
				angular.forEach(records, function (record) 
				{
					if (! record.readonly)
					{
						if (allSelected)
							rowSelect(record);
						else
							rowUnselect(record);
					}
				});
				
				if (! allSelected) selectedCount = 0;
			};
		}
		
		/** Returns the count of selected rows
		* @public
		*/  
		$scope.list.getSelectedCount = function () {
			return selectedCount;
		};
		
		/** Returns selected rows array
		* @public
		*/  
		$scope.list.getSelectedRows = function () {
			
			var selection = [];
			
			if (records)
				angular.forEach(records, function (record) {
					if (record.flSelected)
						selection.push(record);
				});
			
			return selection;
		};
	}
	
	function rowSelect(record)
	{
		if (options.multiselect)
		{
			record.flSelected = true;
			selectedCount++;
		}
		else
		{
			if (selectedRow) selectedRow.flSelected = false;
			record.flSelected = true;
			selectedRow = record;
			selectedCount = 1;
		}
	}
	
	function rowUnselect(record)
	{
		if (options.multiselect)
		{
			record.flSelected = false;
			selectedCount--;
		}
		else
		{
			selectedRow = false;
			record.flSelected = false;
			selectedCount = 0;
		}
	}
	
	
	//************************************************************
	// Pagination
	//************************************************************
	var client_ds;
	
	function makeScopePagination()
	{
		$scope.list.pagination_info = {};
		
		/** Event listener to trigger page fetching
		* @public
		* @param pagenum number of requested page.
		*/  
		$scope.$on('getPage', function(event, pagenum) {
			getPage(pagenum);
		});
		
		/** Changes the page size.
		* @public
		*/  
		$scope.list.setPageSize = function(val) {
			options.pagesize = val;
			getPage(1);
		}
	}
	
	function getPage(pagenum)
	{
		if (pagenum < 1) return;
		if (pagenum > $scope.list.pagination_info.totalpages) return;
		
		offset = (pagenum - 1) * options.pagesize;
		
		if ( options.paginationOnClient )
		{
			records = flexiListService.pageDataset(client_ds, offset, options.pagesize);
			$scope.list.pagination_info = flexiListService.getPagination(ds_length, offset, options.pagesize, options.pages);
		}
		else
		{
			loadData();
		}
	}
	
	//************************************************************
	// Data load
	//************************************************************
	function request()
	{
		var deferred = $q.defer();
		
		var post_data = {};
		post_data.limited = 0;
		
		post_data.where = options.where;
		post_data.orderby = options.orderby;
		
		if (options.limit)
		{
			post_data.limit = options.limit;
			post_data.limited = 1;
			post_data.offset = 0;
		}
		else
		{
			if (options.pagination && ! options.paginationOnClient)
			{
				post_data.limit = options.pagesize;
				post_data.offset = offset;
			}
		}
		
		if (options.urlencoded)
		{
			if (options.method == 'GET')
				$http({
					method: 'GET',
					url: options.listURL + '?' + jQuery.param(post_data)
					/*
					//Does not work as expected
					params: post_data,
					paramSerializer: '$httpParamSerializerJQLike'
					*/
				}).success(function(data, status) {
					deferred.resolve(data);
				}).error(function(data, status){
					deferred.reject('ERROR: ' + status);
				});
			else
				$http({
					method: 'POST',
					url: options.listURL,
					data: jQuery.param(post_data),
					headers: {'Content-Type': 'application/x-www-form-urlencoded'}
					/*
					//Does not work as expected
					params: post_data,
					paramSerializer: '$httpParamSerializerJQLike'
					*/
				}).success(function(data, status) {
					deferred.resolve(data);
				}).error(function(data, status){
					deferred.reject('ERROR: ' + status);
				});
		}
		else
		{
			if (options.method == 'GET')
				$http({
					method: 'GET',
					url: options.listURL,
					params: post_data
				}).success(function(data, status) {
					deferred.resolve(data);
				}).error(function(data, status){
					deferred.reject('ERROR: ' + status);
				});
			else
				$http.post(options.listURL, post_data)
				.success(function(data, status) {
					deferred.resolve(data);
				}).error(function(data, status){
					deferred.reject('ERROR: ' + status);
				});
		}
		
		return deferred.promise;
	}
	
	function requestJsonFile()
	{
		var deferred = $q.defer();
		
		$http({
			method: 'GET',
			url: options.jsonFile
		}).success(function(data, status) {
			deferred.resolve(data);
		}).error(function(data, status){
			deferred.reject('ERROR: ' + status);
		});
		
		return deferred.promise;
	}
	
	function loadInlineData()
	{
		options.paginationOnClient = true;
		dataLoaded = true;
		
		client_ds = flexiListService.processDataset(
			options.data, 
			options.where,
			options.orderby,
			options.limit
		);
		
		ds_length = client_ds.length;
		
		if (options.pagination)
		{
			records = flexiListService.pageDataset(client_ds, offset, options.pagesize);
			$scope.list.pagination_info = flexiListService.getPagination(ds_length, offset, options.pagesize, options.pages);
		}
		else
		{
			records = client_ds;
		}
		
		if (options.onRecordsLoaded) options.onRecordsLoaded(records);
	}
	
	function loadJsonFile()
	{
		options.paginationOnClient = true;
		var promise = requestJsonFile();
		
		promise.then(
			function(data){
				
				dataLoaded = true;
				
				client_ds = flexiListService.processDataset(
					data, 
					options.where,
					options.orderby,
					options.limit
				);
				
				ds_length = client_ds.length;
				
				if (options.pagination)
				{
					records = flexiListService.pageDataset(client_ds, offset, options.pagesize);
					$scope.list.pagination_info = flexiListService.getPagination(ds_length, offset, options.pagesize, options.pages);
				}
				else
				{
					records = client_ds;
				}
				
				if (options.onRecordsLoaded) options.onRecordsLoaded(records);
			}, 
			function(reason) {
				dataLoaded = true;
				records = [];
				$log.log(options.logid + ' - Load Error: ' + reason);
				if (options.onLoadError) options.onLoadError({result: 'ERROR', message: reason});
			}
		);
	}
	
	function loadFromDb()
	{
		var ajax = request();
		
		ajax.then(
			function(data){
				
				dataLoaded = true;
				
				if (data.result == 'ERROR')
				{
					$log.log(options.logid + ' - Load Error.');
					if (options.onLoadError) options.onLoadError(data);
				}
				
				if (! data.records) data.records = [];
				
				if (data.orderby) setOrderby(data.orderby);
				
				ds_length = data.rowcount;
				
				if (options.pagination)
				{
					if ( options.paginationOnClient )
					{
						client_ds = data.records;
						records = flexiListService.pageDataset(client_ds, offset, options.pagesize);
						$scope.list.pagination_info = flexiListService.getPagination(ds_length, offset, options.pagesize, options.pages);
					}
					else
					{
						client_ds = [];
						records = data.records;
						$scope.list.pagination_info = flexiListService.getPagination(ds_length, data.offset, options.pagesize, options.pages);
					}
				}
				else
				{
					client_ds = [];
					records = data.records;
				}
				
				if (options.onRecordsLoaded) options.onRecordsLoaded(records);
			}, 
			function(reason) {
				dataLoaded = true;
				records = [];
				$log.log(options.logid + ' - Load Error: ' + reason);
				if (options.onLoadError) options.onLoadError({result: 'ERROR', message: reason});
			}
		);
	}
	
	function loadData()
	{
		if (options.overlayToggle)	options.overlayToggle();
		
		if (options.data)
		{
			loadInlineData();
		}
		else if (options.jsonFile)
		{
			loadJsonFile();
		}
		else if (options.listURL)
		{
			loadFromDb();
		}
		else
		{
			$log.log(options.logid + ' - undefined data source.');
		}
		
		if (options.overlayToggle)	options.overlayToggle();
	}
}]);






/* 
*******************************************************************************
** Directives
*******************************************************************************
*/

/**
 * @ngdoc directive
 * @name flMain
 * @description 
 * Exposes the API to the templates.
 */
flexiList.directive('flMain', function() {
	return {
		restrict: 'E',
		scope: {list: '='},
		controller: 'flMainCtrl'
	};
});

/**
 * @ngdoc directive
 * @name flFieldDisplay
 * @description 
 * Directive for custom display of record data.
 */
flexiList.directive('flFieldDisplay', function() {
	return {
		restrict: 'E',
		link: function link(scope, element, attrs) {
			if (scope.list.displayField)
				scope.list.displayField(scope, element, attrs);
			else
				element.html(attrs['value']);
		}
	};
});





/* 
*******************************************************************************
** Filters
*******************************************************************************
*/

/**
 * @ngdoc filter
 * @name eq
 * @description 
 * Evaluates the "Equal" condition.
 */
flexiList.filter('eq', function() {
	return function(value, pattern, insensitive) {
		if (insensitive)
			return (value.toLowerCase() == pattern.toLowerCase());
		else
			return (value == pattern);
	};
});

/**
 * @ngdoc filter
 * @name ne
 * @description 
 * Evaluates the "Not equal" condition.
 */
flexiList.filter('ne', function() {
	return function(value, pattern) {
		return (value != pattern);
	};
});

/**
 * @ngdoc filter
 * @name gt
 * @description 
 * Evaluates the "Greater" condition.
 */
flexiList.filter('gt', function() {
	return function(value, pattern) {
		return (value > pattern);
	};
});

/**
 * @ngdoc filter
 * @name ge
 * @description 
 * Evaluates the "Greater equal" condition.
 */
flexiList.filter('ge', function() {
	return function(value, pattern) {
		return (value >= pattern);
	};
});

/**
 * @ngdoc filter
 * @name lt
 * @description 
 * Evaluates the "Lower" condition.
 */
flexiList.filter('lt', function() {
	return function(value, pattern) {
		return (value < pattern);
	};
});

/**
 * @ngdoc filter
 * @name le
 * @description 
 * Evaluates the "Lower Equal" condition.
 */
flexiList.filter('le', function() {
	return function(value, pattern) {
		return (value <= pattern);
	};
});

/**
 * @ngdoc filter
 * @name like_l
 * @description 
 * Evaluates the "LIKE" condition with a wildcard on the left. Eg. %PATTERN
 */
flexiList.filter('like_l', function() {
	return function(value, pattern, insensitive) {
		if (insensitive)
			return (value.toLowerCase().indexOf(pattern.toLowerCase(), value.length - pattern.length) !== -1);
		else
			return (value.indexOf(pattern, value.length - pattern.length) !== -1);
	};
});

/**
 * @ngdoc filter
 * @name like_r
 * @description 
 * Evaluates the "LIKE" condition with a wildcard on the right. Eg. PATTERN%
 */
flexiList.filter('like_r', function() {
	return function(value, pattern, insensitive) {
		if (insensitive)
			return (value.toLowerCase().indexOf(pattern.toLowerCase()) === 0);
		else
			return (value.indexOf(pattern) === 0);
	};
});

/**
 * @ngdoc filter
 * @name like_b
 * @description 
 * Evaluates the "LIKE" condition with left and right wildcards. Eg. %PATTERN%
 */
flexiList.filter('like_b', function() {
	return function(value, pattern, insensitive) {
		if (insensitive)
			return (value.toLowerCase().indexOf(pattern.toLowerCase()) !== -1);
		else
			return (value.indexOf(pattern) !== -1);
	};
});

/**
 * @ngdoc filter
 * @name is_null
 * @description 
 * Evaluates the "IS NULL" condition
 */
flexiList.filter('is_null', function() {
	return function(value, pattern) {
		return (value.toString().length == 0);
	};
});

/**
 * @ngdoc filter
 * @name is_not_null
 * @description 
 * Evaluates the "IS NOT NULL" condition
 */
flexiList.filter('is_not_null', function() {
	return function(value, pattern) {
		return (value.toString().length > 0);
	};
});

/**
 * @ngdoc filter
 * @name regexp
 * @description 
 * Evaluates the a condition based on a regular expression
 */
flexiList.filter('regexp', function() {
	return function(value, pattern, modifier) {
		var regex = new RegExp(pattern, modifier);
		return regex.test(value);
	};
});