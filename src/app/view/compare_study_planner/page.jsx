'use client';
import { useState } from 'react';
import { ConditionalRequireAuth } from '@components/helper';
import { useRole } from '@app/context/RoleContext';
import AccessDenied from '@components/AccessDenied';
import PageLoadingWrapper from '@components/PageLoadingWrapper';
import SecureFrontendAuthHelper from '@utils/auth/FrontendAuthHelper';
import { MagnifyingGlassIcon, CheckCircleIcon, AcademicCapIcon, ChartBarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';

export default function CompareStudyPlannerPage() {
	const { can, isSuperadmin } = useRole();
	const [studentId, setStudentId] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [matchedPlanners, setMatchedPlanners] = useState([]);
	const [studentInfo, setStudentInfo] = useState(null);
	const [searched, setSearched] = useState(false);
	const [completedUnits, setCompletedUnits] = useState([]);
	const [exporting, setExporting] = useState(false);

	// Check if user has permission to access this page
	const hasAccess = isSuperadmin() || can('planner', 'read');

	// Fetch student's completed units from UnitHistory
	const fetchStudentCompletedUnits = async (studentId) => {
		try {
			// Use the correct API path
			const response = await SecureFrontendAuthHelper.authenticatedFetch(
				`${process.env.NEXT_PUBLIC_SERVER_URL}/api/students/student_unit_history?studentId=${studentId}`
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch student units: ${response.status}`);
			}

			const result = await response.json();
			
			// Filter only passed units
			const passedUnits = (result.units || [])
				.filter(unit => unit.Status?.toLowerCase() === 'pass')
				.map(unit => ({
					id: unit.UnitID,
					code: unit.Unit?.UnitCode || '',
					name: unit.Unit?.Name || '',
					status: unit.Status,
					year: unit.Year,
					termId: unit.TermID,
					creditPoints: unit.Unit?.CreditPoints || 0
				}));

			return passedUnits;
		} catch (err) {
			console.error('Error fetching student completed units:', err);
			throw err;
		}
	};

	// Fetch all study planners
	const fetchAllStudyPlanners = async () => {
		try {
			const response = await SecureFrontendAuthHelper.authenticatedFetch(
				`${process.env.NEXT_PUBLIC_SERVER_URL}/api/study-planner`
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch study planners: ${response.status}`);
			}

			const result = await response.json();
			
			if (result.success) {
				return result.data;
			} else {
				throw new Error(result.message || 'Failed to fetch study planners');
			}
		} catch (err) {
			console.error('Error fetching study planners:', err);
			throw err;
		}
	};

	// Compare student's completed units with a study planner
	const compareWithPlanner = (completedUnitsMap, planner) => {
		const plannerUnits = planner.units || [];
		
		// Create a map of planner units for quick lookup
		const plannerUnitsMap = new Map();
		plannerUnits.forEach(unit => {
			plannerUnitsMap.set(unit.ID, {
				id: unit.ID,
				code: unit.UnitCode,
				name: unit.Name
			});
		});

		// Find matching units
		const matchingUnits = [];
		let overlapCount = 0;

		completedUnitsMap.forEach((completedUnit, unitId) => {
			if (plannerUnitsMap.has(unitId)) {
				overlapCount++;
				matchingUnits.push({
					id: unitId,
					code: completedUnit.code,
					name: completedUnit.name,
					plannerCode: plannerUnitsMap.get(unitId).code,
					plannerName: plannerUnitsMap.get(unitId).name,
					creditPoints: completedUnit.creditPoints
				});
			}
		});

		const completedCount = completedUnitsMap.size;
		const plannerUnitCount = plannerUnits.length;
		
		const matchStudentPct = completedCount > 0 ? (overlapCount / completedCount) * 100 : 0;
		const matchPlannerPct = plannerUnitCount > 0 ? (overlapCount / plannerUnitCount) * 100 : 0;

		// Calculate total credits from matched units
		const totalMatchedCredits = matchingUnits.reduce((sum, unit) => sum + (unit.creditPoints || 0), 0);

		return {
			plannerId: planner.id,
			plannerName: planner.name,
			createdAt: planner.createdAt,
			overlapCount,
			completedCount,
			plannerUnitCount,
			matchStudentPct,
			matchPlannerPct,
			matchingUnits,
			totalUnits: plannerUnits,
			totalMatchedCredits
		};
	};

	// Export to Excel function
	const exportToExcel = () => {
		try {
			setExporting(true);
			
			// Create workbook
			const workbook = XLSX.utils.book_new();
			
			// 1. Student Information Sheet
			const studentInfoData = [
				['Student Information'],
				['Student ID', studentInfo?.studentId || ''],
				['Total Completed Units', studentInfo?.completedUnitsCount || 0],
				['Total Credits', studentInfo?.totalCredits || 0],
				['Report Generated', new Date().toLocaleString()],
				[],
				['Completed Units List'],
				['Unit Code', 'Unit Name', 'Credit Points', 'Year', 'Term ID']
			];
			
			studentInfo?.completedUnitsList?.forEach(unit => {
				studentInfoData.push([
					unit.code,
					unit.name || '',
					unit.creditPoints || 0,
					unit.year || '',
					unit.termId || ''
				]);
			});
			
			const studentSheet = XLSX.utils.aoa_to_sheet(studentInfoData);
			XLSX.utils.book_append_sheet(workbook, studentSheet, 'Student Information');
			
			// 2. Summary Sheet
			const summaryData = [
				['Study Planner Comparison Summary'],
				['Student ID:', studentInfo?.studentId || ''],
				['Generated:', new Date().toLocaleString()],
				[],
				['Rank', 'Planner Name', 'Planner ID', 'Matching Units', 'Total Student Units', 'Total Planner Units', 
				 '% of Student\'s Completed', '% of Planner\'s Units', 'Matched Credits', 'Created Date']
			];
			
			matchedPlanners.forEach((planner, index) => {
				summaryData.push([
					`#${index + 1}`,
					planner.plannerName,
					planner.plannerId,
					planner.overlapCount,
					planner.completedCount,
					planner.plannerUnitCount,
					`${planner.matchStudentPct.toFixed(1)}%`,
					`${planner.matchPlannerPct.toFixed(1)}%`,
					planner.totalMatchedCredits,
					new Date(planner.createdAt).toLocaleDateString()
				]);
			});
			
			const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
			XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
			
			// 3. Detailed Matching Units for each planner
			matchedPlanners.forEach((planner, index) => {
				const detailData = [
					[`Planner #${index + 1}: ${planner.plannerName}`],
					[`Planner ID: ${planner.plannerId}`],
					[`Match Percentage: ${planner.matchStudentPct.toFixed(1)}% of student's completed units`],
					[`Total Matched Credits: ${planner.totalMatchedCredits}`],
					[],
					['Matched Units', 'Unit Name', 'Credit Points', 'Status']
				];
				
				planner.matchingUnits.forEach(unit => {
					detailData.push([
						unit.code,
						unit.name || '',
						unit.creditPoints || 0,
						'✓ Matched'
					]);
				});
				
				// Add all planner units for comparison
				detailData.push([], ['All Units in This Planner'], ['Unit Code', 'Unit Name', 'In Student\'s Completed']);
				planner.totalUnits.forEach(unit => {
					const isMatched = planner.matchingUnits.some(mu => mu.id === unit.ID);
					detailData.push([
						unit.UnitCode,
						unit.Name || '',
						isMatched ? 'Yes ✓' : 'No'
					]);
				});
				
				const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
				// Sanitize sheet name (max 31 chars, remove invalid characters)
				let sheetName = `Planner_${index + 1}_${planner.plannerName}`.substring(0, 31);
				sheetName = sheetName.replace(/[\\/*?:[\]]/g, '');
				XLSX.utils.book_append_sheet(workbook, detailSheet, sheetName);
			});
			
			// 4. Comparison Matrix Sheet
			const matrixData = [
				['Comparison Matrix - All Units'],
				['Unit Code', 'Student Completed', ...matchedPlanners.map(p => `${p.plannerName} (ID: ${p.plannerId})`)],
			];
			
			// Get all unique units from all planners
			const allUnitsMap = new Map();
			matchedPlanners.forEach(planner => {
				planner.totalUnits.forEach(unit => {
					if (!allUnitsMap.has(unit.ID)) {
						allUnitsMap.set(unit.ID, {
							code: unit.UnitCode,
							name: unit.Name
						});
					}
				});
			});
			
			// Add student's completed units
			studentInfo?.completedUnitsList?.forEach(unit => {
				if (!allUnitsMap.has(unit.id)) {
					allUnitsMap.set(unit.id, {
						code: unit.code,
						name: unit.name
					});
				}
			});
			
			// Create matrix rows
			Array.from(allUnitsMap.entries()).forEach(([unitId, unitInfo]) => {
				const row = [
					unitInfo.code,
					studentInfo?.completedUnitsList?.some(u => u.id === unitId) ? 'Yes' : 'No'
				];
				
				matchedPlanners.forEach(planner => {
					const hasUnit = planner.totalUnits.some(u => u.ID === unitId);
					row.push(hasUnit ? 'Yes' : 'No');
				});
				
				matrixData.push(row);
			});
			
			const matrixSheet = XLSX.utils.aoa_to_sheet(matrixData);
			XLSX.utils.book_append_sheet(workbook, matrixSheet, 'Comparison Matrix');
			
			// 5. Statistics Sheet
			const statsData = [
				['Statistics Summary'],
				['Metric', 'Value'],
				['Total Students Analyzed', '1'],
				['Total Planners Compared', matchedPlanners.length],
				['Average Match Percentage', `${(matchedPlanners.reduce((sum, p) => sum + p.matchStudentPct, 0) / matchedPlanners.length).toFixed(1)}%`],
				['Highest Match Percentage', `${Math.max(...matchedPlanners.map(p => p.matchStudentPct)).toFixed(1)}%`],
				['Total Matched Units Across All Planners', matchedPlanners.reduce((sum, p) => sum + p.overlapCount, 0)],
				['Total Matched Credits', matchedPlanners.reduce((sum, p) => sum + p.totalMatchedCredits, 0)],
				[],
				['Recommendations'],
				['Top Recommendation', matchedPlanners[0]?.plannerName || 'N/A'],
				['Recommended Next Steps', `Student has completed ${matchedPlanners[0]?.overlapCount || 0} out of ${matchedPlanners[0]?.plannerUnitCount || 0} units in the top planner.`]
			];
			
			const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
			XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');
			
			// Save the file
			const fileName = `Study_Planner_Comparison_${studentInfo?.studentId}_${new Date().toISOString().split('T')[0]}.xlsx`;
			XLSX.writeFile(workbook, fileName);
			
			setExporting(false);
		} catch (err) {
			console.error('Error exporting to Excel:', err);
			setError('Failed to export data to Excel');
			setExporting(false);
		}
	};

	const handleSearch = async (e) => {
		e.preventDefault();
		setSearched(true);

		if (!studentId.trim()) {
			setError('Please enter a student ID');
			setMatchedPlanners([]);
			setStudentInfo(null);
			return;
		}

		try {
			setLoading(true);
			setError(null);
			setMatchedPlanners([]);
			setCompletedUnits([]);

			// Fetch student's completed units
			const completedUnitsList = await fetchStudentCompletedUnits(studentId.trim());
			
			if (completedUnitsList.length === 0) {
				setError(`No completed units (status: 'pass') found for student ID "${studentId}". Please check if the student has any passed units.`);
				setStudentInfo(null);
				return;
			}

			// Create a map of completed units
			const completedUnitsMap = new Map();
			completedUnitsList.forEach(unit => {
				completedUnitsMap.set(unit.id, {
					id: unit.id,
					code: unit.code,
					name: unit.name,
					year: unit.year,
					termId: unit.termId,
					creditPoints: unit.creditPoints
				});
			});

			setCompletedUnits(Array.from(completedUnitsMap.values()));
			
			// Calculate total credits from completed units
			const totalCredits = completedUnitsList.reduce((sum, unit) => sum + (unit.creditPoints || 0), 0);
			
			// Set basic student info
			setStudentInfo({
				studentId: studentId.trim(),
				completedUnitsCount: completedUnitsMap.size,
				completedUnitsList: Array.from(completedUnitsMap.values()),
				totalCredits: totalCredits
			});

			// Fetch all study planners
			const allPlanners = await fetchAllStudyPlanners();
			
			if (allPlanners.length === 0) {
				setError('No study planners found in the system');
				return;
			}

			// Compare student with each planner
			const comparisons = allPlanners.map(planner => 
				compareWithPlanner(completedUnitsMap, planner)
			);

			// Sort and get top 5
			const top5Planners = comparisons
				.sort((a, b) => {
					// Sort by overlap count first, then by percentage
					if (b.overlapCount !== a.overlapCount) return b.overlapCount - a.overlapCount;
					if (b.matchStudentPct !== a.matchStudentPct) return b.matchStudentPct - a.matchStudentPct;
					return b.matchPlannerPct - a.matchPlannerPct;
				})
				.slice(0, 5)
				.filter(planner => planner.overlapCount > 0);

			if (top5Planners.length === 0) {
				setError('No matching study planners found for this student\'s completed units');
			}

			setMatchedPlanners(top5Planners);

		} catch (err) {
			console.error('Error searching student:', err);
			setError(err.message || 'Failed to search student data');
			setMatchedPlanners([]);
			setStudentInfo(null);
		} finally {
			setLoading(false);
		}
	};

	const hasReadPermission = hasAccess;

	return (
		<ConditionalRequireAuth>
			{!hasReadPermission ? (
				<AccessDenied requiredPermission="planner:read or system:superadmin" resourceName="study planner comparison" />
			) : (
				<PageLoadingWrapper
					requiredPermission={{ resource: 'dashboard', action: 'access' }}
					resourceName="study planner comparison"
					isLoading={false}
				>
					<div className="page-bg p-6 min-h-screen">
						<div className="max-w-7xl mx-auto">
							<div className="mb-8 flex justify-between items-center">
								<div>
									<h1 className="title-text text-3xl font-bold">Compare Study Planner</h1>
									<p className="text-muted text-sm mt-1">
										Search for a student and compare their completed units with available study planners
									</p>
								</div>
								{matchedPlanners.length > 0 && studentInfo && (
									<button
										onClick={exportToExcel}
										disabled={exporting}
										className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-150"
									>
										<DocumentArrowDownIcon className="h-5 w-5" />
										{exporting ? 'Exporting...' : 'Export to Excel'}
									</button>
								)}
							</div>

							{/* Search Form */}
							<div className="card-bg p-6 rounded-theme shadow-theme mb-8">
								<form onSubmit={handleSearch}>
									<div className="flex flex-col md:flex-row gap-4">
										<div className="flex-1">
											<label className="label-text-alt block mb-2 text-sm font-medium">Student ID</label>
											<input
												type="text"
												value={studentId}
												onChange={(e) => setStudentId(e.target.value)}
												placeholder="Enter student ID..."
												className="input-field w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
										</div>
										<div className="flex items-end">
											<button
												type="submit"
												disabled={loading}
												className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-6 rounded-lg transition duration-150 ease-in-out flex items-center gap-2"
											>
												<MagnifyingGlassIcon className="h-5 w-5" />
												{loading ? 'Searching...' : 'Search'}
											</button>
										</div>
									</div>
								</form>
							</div>

							{/* Error Message */}
							{error && (
								<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
									<strong>Error:</strong> {error}
								</div>
							)}

							{/* Student Information */}
							{studentInfo && (
								<div className="card-bg p-6 rounded-theme shadow-theme mb-8 bg-gradient-to-r from-blue-50 to-indigo-50">
									<h2 className="text-lg font-semibold heading-text mb-4 flex items-center gap-2">
										<AcademicCapIcon className="h-5 w-5" />
										Student Information
									</h2>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div>
											<p className="text-sm text-muted">Student ID</p>
											<p className="font-semibold text-primary text-lg">{studentInfo.studentId}</p>
										</div>
										<div>
											<p className="text-sm text-muted">Completed Units</p>
											<p className="font-semibold text-primary text-lg">{studentInfo.completedUnitsCount}</p>
										</div>
										<div>
											<p className="text-sm text-muted">Total Credits</p>
											<p className="font-semibold text-primary text-lg">{studentInfo.totalCredits}</p>
										</div>
									</div>
									
									{/* Completed Units List */}
									{studentInfo.completedUnitsList && studentInfo.completedUnitsList.length > 0 && (
										<div className="mt-4">
											<p className="text-sm font-semibold text-muted mb-2">Completed Units:</p>
											<div className="flex flex-wrap gap-2">
												{studentInfo.completedUnitsList.map((unit) => (
													<span
														key={unit.id}
														className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
														title={`${unit.name || ''} (${unit.creditPoints} credits)`}
													>
														{unit.code}
													</span>
												))}
											</div>
										</div>
									)}
								</div>
							)}

							{/* Matched Planners */}
							{searched && !error && matchedPlanners.length === 0 && studentInfo ? (
								<div className="card-bg p-12 rounded-theme shadow-theme text-center">
									<ChartBarIcon className="h-16 w-16 text-muted mx-auto mb-4 opacity-50" />
									<p className="text-muted text-lg">No matching study planners found for this student's completed units.</p>
									<p className="text-muted text-sm mt-2">Try checking another student or create a new study planner.</p>
								</div>
							) : (
								matchedPlanners.length > 0 && (
									<div className="space-y-6">
										<h2 className="text-xl font-semibold heading-text mb-4 flex items-center gap-2">
											<ChartBarIcon className="h-6 w-6" />
											Top {matchedPlanners.length} Matching Study Planners
										</h2>
										
										{matchedPlanners.map((planner, index) => (
											<div key={planner.plannerId} className="card-bg rounded-theme shadow-theme overflow-hidden">
												{/* Planner Header */}
												<div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<div className="flex items-center gap-3 mb-2">
																<span className="text-2xl font-bold text-blue-600">#{index + 1}</span>
																<h3 className="text-xl font-bold heading-text">
																	{planner.plannerName}
																</h3>
															</div>
															<p className="text-sm text-muted">
																Planner ID: {planner.plannerId} | Created: {new Date(planner.createdAt).toLocaleDateString()}
															</p>
														</div>
													</div>

													{/* Statistics Cards */}
													<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
														<div className="bg-blue-50 p-3 rounded-lg">
															<p className="text-xs text-muted mb-1">Matching Units</p>
															<p className="text-2xl font-bold text-blue-600">
																{planner.overlapCount} / {planner.completedCount}
															</p>
															<p className="text-xs text-muted">out of student's completed</p>
														</div>
														<div className="bg-indigo-50 p-3 rounded-lg">
															<p className="text-xs text-muted mb-1">Matched Credits</p>
															<p className="text-2xl font-bold text-indigo-600">
																{planner.totalMatchedCredits}
															</p>
															<p className="text-xs text-muted">total credit points</p>
														</div>
														<div className="bg-green-50 p-3 rounded-lg">
															<p className="text-xs text-muted mb-1">% of Student's Completed</p>
															<p className="text-2xl font-bold text-green-600">
																{planner.matchStudentPct.toFixed(1)}%
															</p>
															<div className="w-full bg-green-200 rounded-full h-1.5 mt-2">
																<div 
																	className="bg-green-600 h-1.5 rounded-full transition-all duration-500"
																	style={{ width: `${Math.min(planner.matchStudentPct, 100)}%` }}
																></div>
															</div>
														</div>
														<div className="bg-purple-50 p-3 rounded-lg">
															<p className="text-xs text-muted mb-1">% of Planner's Units</p>
															<p className="text-2xl font-bold text-purple-600">
																{planner.matchPlannerPct.toFixed(1)}%
															</p>
															<div className="w-full bg-purple-200 rounded-full h-1.5 mt-2">
																<div 
																	className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
																	style={{ width: `${Math.min(planner.matchPlannerPct, 100)}%` }}
																></div>
															</div>
														</div>
													</div>
												</div>

												{/* Matching Units Section */}
												<div className="p-6">
													<h4 className="font-semibold text-sm heading-text mb-3 flex items-center gap-2">
														<CheckCircleIcon className="h-4 w-4 text-green-600" />
														Matched Units ({planner.matchingUnits.length})
													</h4>
													
													{planner.matchingUnits.length > 0 ? (
														<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
															{planner.matchingUnits.map((unit, idx) => (
																<div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3 hover:shadow-md transition-shadow">
																	<div className="flex items-start justify-between">
																		<div className="flex-1">
																			<p className="font-mono text-sm font-semibold text-green-800">
																				{unit.code}
																			</p>
																			{unit.name && (
																				<p className="text-xs text-green-700 mt-1">
																					{unit.name}
																				</p>
																			)}
																			{unit.creditPoints > 0 && (
																				<p className="text-xs text-green-600 mt-1">
																					{unit.creditPoints} credits
																				</p>
																			)}
																		</div>
																		<CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
																	</div>
																</div>
															))}
														</div>
													) : (
														<p className="text-sm text-muted">No matching units found</p>
													)}
												</div>

												{/* All Planner Units (Collapsible) */}
												<details className="border-t">
													<summary className="px-6 py-3 cursor-pointer hover:bg-gray-50 text-sm font-medium text-muted">
														View all units in this planner ({planner.totalUnits.length} total)
													</summary>
													<div className="px-6 pb-4 pt-2">
														<div className="flex flex-wrap gap-2">
															{planner.totalUnits.map((unit) => {
																const isMatched = planner.matchingUnits.some(mu => mu.id === unit.ID);
																return (
																	<span
																		key={unit.ID}
																		className={`text-xs font-medium px-2.5 py-1 rounded-full ${
																			isMatched
																				? 'bg-green-100 text-green-800 border border-green-300'
																				: 'bg-gray-100 text-gray-600'
																		}`}
																	>
																		{unit.UnitCode}
																		{isMatched && ' ✓'}
																	</span>
																);
															})}
														</div>
													</div>
												</details>
											</div>
										))}
									</div>
								)
							)}

							{/* No Search Yet */}
							{!searched && !studentInfo && !error && (
								<div className="card-bg p-12 rounded-theme shadow-theme text-center">
									<MagnifyingGlassIcon className="h-16 w-16 text-muted mx-auto mb-4 opacity-50" />
									<p className="text-muted text-lg">Enter a student ID to search and compare study planners</p>
									<p className="text-muted text-sm mt-2">The system will analyze completed units and find the best matching study planners</p>
								</div>
							)}
						</div>
					</div>
				</PageLoadingWrapper>
			)}
		</ConditionalRequireAuth>
	);
}