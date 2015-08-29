'use strict';
	
/**
* @fileOverview
* @author Guido Donnari - https://github.com/elislenio/flexi-list
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
 *   Provides functions to:
 *		- Load data from server.
 *  	- Load data from a JSON file.
 *		- Sort, filter, limit and page the dataset.
 */
flexiList.factory('flexiListService', ['$q', '$http', '$log', '$filter', function($q, $http, $log, $filter) {
	
	return {
		
	requestJsonFile: function(jsonFile)
	{
		var deferred = $q.defer();
		
		$http({
			method: 'GET',
			url: jsonFile
		}).success(function(data, status) {
			deferred.resolve(data);
		}).error(function(data, status){
			deferred.reject('ERROR: ' + status);
		});
		
		return deferred.promise;
	},
	
	requestServer: function(options, offset)
		{
			var deferred = $q.defer();
			
			var post_data = {};
			
			if (options.limit) post_data.limit = options.limit;
			
			if (options.searchable && ! options.searchOnClient)
				post_data.where = options.where;
			
			if (options.sortable && ! options.sortOnClient)
				post_data.orderby = options.orderby;
			
			if (options.pagination && ! options.paginationOnClient)
			{
				post_data.offset = offset;
				post_data.pagesize = options.pagesize;
			}
			
			if (options.urlencoded)
			{
				if (options.method == 'GET')
				{	
					var v_url = options.listURL + '?' + jQuery.param(post_data);
					if (options.log.debug) $log.log(options.log.id + ' URL: ' + v_url);
				
					$http({
						method: 'GET',
						url: v_url
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
		},
	
		sortDataset: function(dataset, orderby, log)
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
		filterDataset: function(dataset, where, log)
		{
			var filtered_ds = [];
			var field;
			var value;
			var condition;
			var pattern;
			var options;
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
						options = where[j].options;
						
						
						if (! field)	continue;
						if (! condition)	continue;
						//if (! pattern)	continue;
						//if (! value)	continue;
						
						try {
							passed = $filter(condition)(value, pattern, options);
						} catch (e){
							if (log.err) $log.log(log.id + ' - flexiListService: filter exception at ', e);
							passed = true;
						}
						
						if (log.debug)	$log.log(log.id + ' - filterDataset: value=' + value + ' condition=' + condition + ' pattern=' + pattern + ' passed=' + passed);
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
		
		processDataset: function(dataset, where, orderby, limit, log)
		{
			var filtered_ds = this.filterDataset(dataset, where, log);
			var ordered_ds = this.sortDataset(filtered_ds, orderby, log);
			var limited_ds = $filter('limitTo')(ordered_ds, limit);
			return limited_ds;
		},
		
		pageDataset: function(dataset, offset, pagesize, log)
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
flexiList.controller('flMainCtrl', ['$scope', '$log', '$q', '$http', '$filter', 'flexiListService', 
function($scope, $log, $q, $http, $filter, flexiListService) {
	
	var options = {
		data: false,
		jsonFile: false,
		listURL: false,
		autoload: true,
		selectable: true,
		multiselect: true,
		limit: false,
		searchable: true,
		searchOnClient: false,
		where: [],
		sortable: true,
		sortOnClient: false,
		orderby: [],
		pagination: true,
		paginationOnClient: false,
		pagination_clear_selection: true,
		pagesize: 10,
		pages: 5,
		method: 'GET',
		urlencoded: true,
		log: {id: 'FL', err: false, debug: false}
	};
	
	// Dataset as loaded from source
	$scope.list.loadedDS = false;
	
	// Dataset after filter, sort and limit operations
	$scope.list.client_ds;
	var ds_length;
	
	// Dataset after pagination (records displayed)
	$scope.list.records = [];
	var offset = 0;
	
	// Pagination information
	$scope.list.pagination_info = {};
	
	init();
	
	function init()
	{
		if (!$scope.list)
		{
			if (options.log.err) $log.log(options.log.id + ' - undefined scope.');
			return;
		}
		
		angular.extend(options, $scope.list.options);
		
		/** Trigger data loading
		* @public
		* @param p_options options.
		*/
		$scope.list.loadData = function (p_options, offset_reset) {
			
			angular.extend(options, p_options);
			
			if (offset_reset) offset = 0;
			
			loadData();
		};
		
		/** Change options without reloading data
		* @public
		* @param p_options options.
		*/
		$scope.list.change = function (p_options) {
			change(p_options);
		};
		
		/** Reloads data using the current options settings
		* @public
		*/  
		$scope.list.refresh = function () {
			loadData();
		};
		
		/** Returns the select enabled status
		* @public
		*/  
		$scope.list.selectEnabled = function () {
			return options.selectable;
		};
		
		/** Returns the select enabled status
		* @public
		*/  
		$scope.list.multiselectEnabled = function () {
			return (options.selectable && options.multiselect);
		};
		
		/** Returns the pagination enabled status
		* @public
		*/  
		$scope.list.paginationEnabled = function () {
			
			if (! options.pagination)	return false;
			
			if ($scope.list.records.length > 0) return true;
			
			return false;
		};
		
		/** Returns the sort enabled status
		* @public
		*/  
		$scope.list.sortEnabled = function () {
			return options.sortable;
		};
		
		/** Returns the search enabled status
		* @public
		*/  
		$scope.list.searchEnabled = function () {
			return options.searchable;
		};
		
		/** Returns true whenever the result set has no records
		* @public
		*/  
		$scope.list.isEmpty = function () {
			return ($scope.list.records.length == 0 && $scope.list.loadedDS);
		};
		
		if (options.sortable) makeScopeSortable();
		if (options.pagination) makeScopePagination();
		if (options.selectable) makeScopeSelectable();
		if (options.autoload) loadData();
	};
	
	
	//************************************************************
	// Sortable
	//************************************************************
	var sorted = [];
	
	function makeScopeSortable()
	{
		/** Returns true whenever the list is sorted "asc" by the given field
		* @public
		*/  
		$scope.list.isSortedAsc = function(field)
		{
			if (! sorted)	return false;
			return (sorted[field] == 'asc');
		};
		
		/** Returns true whenever the list is sorted "desc" by the given field
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
	
	/*
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
	*/
	
	function transformSorted()
	{
		var arr = [];
		
		if (options.orderby)
			for (var i=0; i < options.orderby.length; i++)
				arr[options.orderby[i].field] = options.orderby[i].type;
		
		return arr;
	}
	
	//************************************************************
	// Record Selection
	//************************************************************
	var selectedRecord = false;
	var selectedCount = 0;
	var allSelected = false;
	
	function makeScopeSelectable()
	{
		/** Returns true whenever the given record is selected
		* @public
		*/  
		$scope.list.isRecordSelected = function (record) {
			if (! record.flSelected )	return false;
			return true;
		};
		
		/** Toggles record selection
		* @public
		*/  
		$scope.list.recordToggleSelect = function (record) {
			if (record.flSelected) recordUnselect(record, false);
			else recordSelect(record, false);
		};
		
		/** Triggers the validation of record selection after changing record.flSelected model.
		* @public
		*/
		$scope.list.enforceSelection = function (record) {
			if (record.flSelected) recordSelect(record, true);
			else recordUnselect(record, true);
		};
		
		/** Returns the next selection state for all record
		* @public
		*/  
		$scope.list.getToggleSelNextState = function () {
			return allSelected;
		};
		
		if (options.multiselect)
		{
			/** Toggles the selection state for all record
			* @public
			*/		
			$scope.list.toggleSelectAll = function () {
			
				if (! $scope.list.records)	return;
				
				// Reverse selected state and apply
				allSelected = (! allSelected);
				selectionApplyAll(allSelected, true);
			};
		}
		
		/** Returns the selected records count
		* @public
		*/  
		$scope.list.getSelectedCount = function () {
			return selectedCount;
		};
		
		/** Returns the selected records array
		* @public
		*/  
		$scope.list.getSelectedRecords = function () {
			
			var selection = [];
			
			if ($scope.list.records)
				angular.forEach($scope.list.records, function (record) {
					if (record.flSelected)
						selection.push(record);
				});
			
			return selection;
		};
	};
	
	function selectionApplyAll(selected, current_page)
	{
		if (current_page)
			angular.forEach($scope.list.records, function (record) 
			{
				if (selected)
					recordSelect(record, false);
				else
					recordUnselect(record, false);
			});
		else
			angular.forEach($scope.list.client_ds, function (record) 
			{
				if (selected)
					recordSelect(record, false);
				else
					recordUnselect(record, false);
			});
			
		allSelected = selected;
	};
	
	function recordSelect(record, force)
	{
		if (record.readonly) return;
		
		if (! force)
			if (record.flSelected) return;
		
		if (options.multiselect)
		{
			record.flSelected = true;
			selectedCount++;
		}
		else
		{
			if (selectedRecord) selectedRecord.flSelected = false;
			record.flSelected = true;
			selectedRecord = record;
			selectedCount = 1;
		}
	}
	
	function recordUnselect(record, force)
	{
		if (record.readonly) return;
		
		if (! force)
			if (! record.flSelected) return;
			
		if (options.multiselect)
		{
			record.flSelected = false;
			selectedCount--;
		}
		else
		{
			selectedRecord = false;
			record.flSelected = false;
			selectedCount = 0;
		}
	}
	
	
	//************************************************************
	// Pagination
	//************************************************************
		
	function makeScopePagination()
	{
		/** Triggers page change
		* @public
		* @param pagenum number of requested page.
		*/
		$scope.list.changePage = function (pagenum) {
			getPage(pagenum);
		};
		
		/** Changes the page size.
		* @public
		*/  
		$scope.list.setPageSize = function(size) {
			options.pagesize = size;
			getPage(1);
		}
	}
	
	function getPage(pagenum)
	{
		if (pagenum < 1) return;
		if (pagenum > $scope.list.pagination_info.totalpages) return;
		
		$scope.$emit('flStartOp', {op: 'getPage'});
		
		// Unselect records that are not in the current page
		if (options.selectable && options.pagination_clear_selection)
			selectionApplyAll(false, false);
		
		offset = (pagenum - 1) * options.pagesize;
		
		if ( options.paginationOnClient )
		{
			$scope.list.records = flexiListService.pageDataset($scope.list.client_ds, offset, options.pagesize, options.log);
			$scope.list.pagination_info = flexiListService.getPagination(ds_length, offset, options.pagesize, options.pages);
			$scope.$emit('flComplete', {result: 'OK'});
		}
		else
		{
			loadData();
		}
	}
	
	//************************************************************
	// Data load
	//************************************************************
	
	function loadInlineData()
	{
		options.paginationOnClient = true;
		options.sortOnClient = true;
		options.searchOnClient = true;
		
		$scope.list.loadedDS = options.data;
		
		if (! $scope.list.loadedDS)
		{
			$scope.list.loadedDS = [];
			if (options.log.err) $log.log(options.log.id + ' - Load Error.');
		}
				
		$scope.list.client_ds = flexiListService.processDataset(
			options.data, 
			options.where,
			options.orderby,
			options.limit,
			options.log
		);
		
		ds_length = $scope.list.client_ds.length;
		
		if (options.pagination)
		{
			$scope.list.records = flexiListService.pageDataset($scope.list.client_ds, offset, options.pagesize, options.log);
			$scope.list.pagination_info = flexiListService.getPagination(ds_length, offset, options.pagesize, options.pages);
		}
		else
		{
			$scope.list.records = $scope.list.client_ds;
		}
		
		sorted = transformSorted();
	}
	
	function processDataset()
	{
		$scope.list.client_ds = flexiListService.processDataset(
			$scope.list.loadedDS, 
			options.where,
			options.orderby,
			options.limit,
			options.log
		);
		
		ds_length = $scope.list.client_ds.length;
		
		if (options.pagination)
		{
			$scope.list.records = flexiListService.pageDataset($scope.list.client_ds, offset, options.pagesize, options.log);
			$scope.list.pagination_info = flexiListService.getPagination(ds_length, offset, options.pagesize, options.pages);
		}
		else
		{
			$scope.list.records = $scope.list.client_ds;
		}
	}
	
	function loadJsonFile()
	{
		options.paginationOnClient = true;
		options.sortOnClient = true;
		options.searchOnClient = true;
		
		var promise = flexiListService.requestJsonFile(options.jsonFile);
		
		promise.then(
			function(data){
				
				if (options.log.debug) $log.log(options.log.id + ' - Data: ' + $filter('json')(data));
				
				if (! data)	data = [];
				
				$scope.list.loadedDS = data;
				processDataset();
				sorted = transformSorted();
				
				$scope.$emit('flComplete', {result: 'OK'});
			}, 
			function(reason) {
				if (options.log.err) $log.log(options.log.id + ' - Load Error: ' + reason);
				$scope.list.loadedDS = [];
				$scope.list.records = [];
				$scope.$emit('flComplete', {result: 'ERROR', message: reason});
			}
		);
	};
	
	function loadFromServer()
	{
		var ajax = flexiListService.requestServer(options, offset);
		
		ajax.then(
			function(data){
				
				$scope.list.server_response = data;
				if (options.log.debug) $log.log(options.log.id + ' - Data: ' + $filter('json')(data));
				
				if (! data)	
				{
					data = {};
				}
				else
				{
					if (data.result != 'OK')
						if (options.log.err) 
							$log.log(options.log.id + ' - data.result: ' + data.result);
				}
				
				if (! data.records) data.records = [];
				
				$scope.list.loadedDS = data.records;
				
				// Follow the server response if a where clause is informed
				if (data.where) options.where = data.where;
					
				// Follow the server response if an orderby clause is informed
				if (data.orderby) 
					setOrderby(data.orderby);
				else
					sorted = transformSorted();
				
				// Follow the server response if a rowcount is informed (it should be informed)
				if (data.rowcount)
					ds_length = data.rowcount;
				else
					ds_length = data.records.length;
				
				$scope.list.client_ds = data.records;
				
				if ( options.searchable && options.searchOnClient )
				{
					$scope.list.client_ds = flexiListService.filterDataset($scope.list.client_ds, options.where, options.log);
					ds_length = $scope.list.client_ds.length;
				}
				
				if ( options.sortable && options.sortOnClient )
					$scope.list.client_ds = flexiListService.sortDataset($scope.list.client_ds, options.orderby, options.log);
				
				if (options.pagination)
				{
					if ( options.paginationOnClient )
					{
						$scope.list.records = flexiListService.pageDataset($scope.list.client_ds, offset, options.pagesize, options.log);
						$scope.list.pagination_info = flexiListService.getPagination(ds_length, offset, options.pagesize, options.pages);
					}
					else
					{
						$scope.list.records = data.records;
						
						// Follow the server response if an offset or pagesize is informed
						var v_offset;
						
						if (data.offset) v_offset = data.offset;
						else v_offset = offset;
						
						if (data.pagesize) options.pagesize = data.pagesize;
						
						$scope.list.pagination_info = flexiListService.getPagination(ds_length, v_offset, options.pagesize, options.pages);
					}
				}
				else
				{
					$scope.list.records = $scope.list.client_ds;
				}
				
				if (data.result != 'OK')
					$scope.$emit('flComplete', {result: 'ERROR', message: data.result});
				else
					$scope.$emit('flComplete', {result: 'OK'});
			}, 
			function(reason) {
				if (options.log.err) $log.log(options.log.id + ' - Load Error: ' + reason);
				$scope.list.loadedDS = [];
				$scope.list.records = [];
				$scope.$emit('flComplete', {result: 'ERROR', message: reason});
			}
		);
	};
	
	function change(p_options)
	{
		$scope.$emit('flStartOp', {op: 'change'});
		angular.extend(options, p_options);
		
		// Unselect all records
		if (options.selectable) selectionApplyAll(false, false);
		// Reset to first page
		offset = 0;
		
		processDataset();
		sorted = transformSorted();
		$scope.$emit('flComplete', {result: 'OK'});
	};
	
	function loadData()
	{
		$scope.$emit('flStartOp', {op: 'loadData'});
		
		selectedCount = 0;
		
		if (options.data)
		{
			loadInlineData();
			$scope.$emit('flComplete', {result: 'OK'});
		}
		else if (options.jsonFile)
		{
			loadJsonFile();
		}
		else if (options.listURL)
		{
			loadFromServer();
		}
		else
		{
			if (options.log.err) $log.log(options.log.id + ' - Undefined data source.');
			$scope.$emit('flComplete', {result: 'ERROR', message: 'Undefined data source'});
		}
		
	};
}]);






/* 
*******************************************************************************
** Directive
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
	return function(value, pattern, options) {
		if (value == undefined || pattern == undefined) return true;
		if (options.insensitive)
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
		if (value == undefined || pattern == undefined) return true;
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
		if (value == undefined || pattern == undefined) return true;
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
		if (value == undefined || pattern == undefined) return true;
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
		if (value == undefined || pattern == undefined) return true;
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
		if (value == undefined || pattern == undefined) return true;
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
	return function(value, pattern, options) {
		if (value == undefined || pattern == undefined) return true;
		if (options.insensitive)
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
	return function(value, pattern, options) {
		if (value == undefined || pattern == undefined) return true;
		if (options.insensitive)
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
	return function(value, pattern, options) {
		if (value == undefined || pattern == undefined) return true;
		if (options.insensitive)
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
		if (value == undefined) return true;
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
		if (value == undefined) return false;
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
	return function(value, pattern, options) {
		if (value == undefined || pattern == undefined) return true;
		var regex = new RegExp(pattern, options.modifier);
		return regex.test(value);
	};
});